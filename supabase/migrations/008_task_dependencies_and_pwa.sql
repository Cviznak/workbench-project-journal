-- Migration 008: Task Dependencies & Portable Data Export Archive

-- 1. Alter public.project_tasks to add prerequisite_task_id
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS prerequisite_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_tasks_prereq ON public.project_tasks(prerequisite_task_id);

-- 2. Update complete_project_task RPC to enforce prerequisite dependencies
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
  v_prereq RECORD;
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

  -- Enforce prerequisite dependency check
  IF v_task.prerequisite_task_id IS NOT NULL THEN
    SELECT id, title, status INTO v_prereq
    FROM public.project_tasks
    WHERE id = v_task.prerequisite_task_id;

    IF v_prereq.id IS NOT NULL AND v_prereq.status != 'DONE' THEN
      RAISE EXCEPTION 'Cannot complete task: prerequisite task "%" must be completed first.', v_prereq.title;
    END IF;
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

-- 3. Create portable maker archive export RPC
CREATE OR REPLACE FUNCTION public.export_user_maker_archive()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_archive JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'version', '1.3.0',
    'exported_at', now(),
    'profile', (
      SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_user_id
    ),
    'skills', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'skill_id', us.skill_id,
        'skill_name', sc.name,
        'skill_slug', sc.slug,
        'category', sc.category,
        'total_xp', us.total_xp,
        'level', us.level,
        'last_practiced_at', us.last_practiced_at
      ))
      FROM public.user_skills us
      JOIN public.skill_catalog sc ON us.skill_id = sc.id
      WHERE us.user_id = v_user_id
    ), '[]'::jsonb),
    'practice_logs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pl.id,
        'skill_name', sc.name,
        'duration_minutes', pl.duration_minutes,
        'xp_gained', pl.xp_gained,
        'note', pl.note,
        'created_at', pl.created_at
      ))
      FROM public.practice_logs pl
      LEFT JOIN public.skill_catalog sc ON pl.skill_id = sc.id
      WHERE pl.user_id = v_user_id
      ORDER BY pl.created_at DESC
    ), '[]'::jsonb),
    'workspace_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(wi))
      FROM public.workspace_items wi
      WHERE wi.user_id = v_user_id
      ORDER BY wi.created_at DESC
    ), '[]'::jsonb),
    'projects', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr))
      FROM (
        SELECT DISTINCT p.*
        FROM public.projects p
        LEFT JOIN public.project_members pm ON p.id = pm.project_id
        WHERE p.pm_user_id = v_user_id OR pm.user_id = v_user_id
        ORDER BY p.created_at DESC
      ) pr
    ), '[]'::jsonb),
    'tasks', COALESCE((
      SELECT jsonb_agg(to_jsonb(pt))
      FROM public.project_tasks pt
      WHERE pt.assignee_id = v_user_id
         OR pt.project_id IN (
           SELECT p.id FROM public.projects p WHERE p.pm_user_id = v_user_id
         )
      ORDER BY pt.created_at DESC
    ), '[]'::jsonb),
    'comments', COALESCE((
      SELECT jsonb_agg(to_jsonb(tc))
      FROM public.task_comments tc
      WHERE tc.user_id = v_user_id
      ORDER BY tc.created_at DESC
    ), '[]'::jsonb),
    'activity_logs', COALESCE((
      SELECT jsonb_agg(to_jsonb(al))
      FROM public.activity_logs al
      WHERE al.user_id = v_user_id
      ORDER BY al.created_at DESC
    ), '[]'::jsonb)
  ) INTO v_archive;

  RETURN v_archive;
END;
$$;
