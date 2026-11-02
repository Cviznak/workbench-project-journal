-- Migration 007: Fix project_tasks update RLS subquery bug & protect xp_awarded via trigger

-- 1. Replace the flawed RLS policy on public.project_tasks that had a recursive self-referencing subquery
DROP POLICY IF EXISTS "Tasks updatable by project members" ON public.project_tasks;

CREATE POLICY "Tasks updatable by project members"
  ON public.project_tasks FOR UPDATE
  TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

-- 2. Create the BEFORE UPDATE trigger to safely guard xp_awarded tampering
CREATE OR REPLACE FUNCTION public.guard_task_xp_tamper()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Disallow un-awarding XP once awarded
  IF OLD.xp_awarded = true AND NEW.xp_awarded = false THEN
    RAISE EXCEPTION 'Cannot revoke awarded XP';
  END IF;

  -- If client tries to flip xp_awarded from false to true directly
  IF OLD.xp_awarded = false AND NEW.xp_awarded = true THEN
    IF current_setting('workbench.granting_xp', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'Direct manipulation of xp_awarded is forbidden. Use complete_project_task RPC.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_task_xp_tamper ON public.project_tasks;
CREATE TRIGGER trg_guard_task_xp_tamper
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.guard_task_xp_tamper();

-- 3. Update complete_project_task to set local session flag when setting xp_awarded
CREATE OR REPLACE FUNCTION public.complete_project_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_caller_id UUID := auth.uid();
  v_task RECORD;
  v_assignee_id UUID;
  v_skill_id UUID;
  v_xp_reward INT;
  v_proj RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_task
  FROM public.project_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF NOT public.is_project_member(v_task.project_id) THEN
    RAISE EXCEPTION 'Forbidden: You are not a member of this project';
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = v_task.project_id;

  -- Auto-assign to caller if unassigned
  v_assignee_id := COALESCE(v_task.assignee_id, v_caller_id);
  v_xp_reward := v_task.xp_reward;

  -- Determine skill
  v_skill_id := v_task.skill_id;
  IF v_skill_id IS NULL THEN
    SELECT skill_id INTO v_skill_id
    FROM public.project_skills
    WHERE project_id = v_task.project_id
    LIMIT 1;
  END IF;

  IF v_skill_id IS NULL THEN
    -- Fallback to general skill
    SELECT id INTO v_skill_id FROM public.skill_catalog WHERE slug = 'general-crafting' LIMIT 1;
    IF v_skill_id IS NULL THEN
      INSERT INTO public.skill_catalog (slug, name, category)
      VALUES ('general-crafting', 'General Crafting', 'General')
      RETURNING id INTO v_skill_id;
    END IF;
  END IF;

  -- Move status to DONE
  UPDATE public.project_tasks
  SET status = 'DONE',
      assignee_id = v_assignee_id,
      updated_at = now()
  WHERE id = p_task_id;

  -- Award XP only if not awarded yet
  IF v_task.xp_awarded = false THEN
    -- Set transaction config so guard trigger permits setting xp_awarded = true
    PERFORM set_config('workbench.granting_xp', '1', true);

    UPDATE public.project_tasks
    SET xp_awarded = true
    WHERE id = p_task_id;

    -- Award XP to assignee
    INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
    VALUES (v_assignee_id, v_skill_id, v_xp_reward, public.calculate_skill_level(v_xp_reward), now())
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      total_xp = user_skills.total_xp + v_xp_reward,
      level = public.calculate_skill_level(user_skills.total_xp + v_xp_reward),
      last_practiced_at = now();

    -- Log activity
    INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
    VALUES (
      v_assignee_id,
      v_task.project_id,
      'TASK_COMPLETED',
      'Completed task: "' || v_task.title || '" (+' || v_xp_reward || ' XP)',
      v_xp_reward,
      jsonb_build_object('task_id', p_task_id, 'task_title', v_task.title, 'project_name', v_proj.name)
    );

    -- Touch consistency streak for assignee
    PERFORM public.touch_user_streak(v_assignee_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'xp_awarded', v_xp_reward,
    'assignee_id', v_assignee_id
  );
END;
$func$;
