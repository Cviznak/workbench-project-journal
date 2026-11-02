-- ============================================================================
-- Migration 005: Task Collaboration Workshop & Maker Consistency Engine
-- 1. Task Comments (Realtime & Markdown)
-- 2. Task Attachments & Private Supabase Storage
-- 3. Daily Streaks & 365-Day Activity Heatmap Engine
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TASK COMMENTS (public.task_comments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_md TEXT NOT NULL CHECK (char_length(trim(content_md)) BETWEEN 1 AND 5000),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON public.task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_comments_project ON public.task_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON public.task_comments(user_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: Allowed if project member or admin
DROP POLICY IF EXISTS "Task comments viewable by project members" ON public.task_comments;
CREATE POLICY "Task comments viewable by project members"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id) OR public.is_admin());

-- INSERT: Allowed if project member and author is caller
DROP POLICY IF EXISTS "Task comments insertable by project members" ON public.task_comments;
CREATE POLICY "Task comments insertable by project members"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_member(project_id) AND auth.uid() = user_id);

-- UPDATE: Author only
DROP POLICY IF EXISTS "Task comments updatable by author" ON public.task_comments;
CREATE POLICY "Task comments updatable by author"
  ON public.task_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Author, Project PM, or Admin
DROP POLICY IF EXISTS "Task comments deletable by author or PM" ON public.task_comments;
CREATE POLICY "Task comments deletable by author or PM"
  ON public.task_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND pm_user_id = auth.uid()) OR
    public.is_admin()
  );

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. TASK ATTACHMENTS (public.task_attachments & storage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880), -- 5MB limit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_project ON public.task_attachments(project_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT
DROP POLICY IF EXISTS "Task attachments viewable by project members" ON public.task_attachments;
CREATE POLICY "Task attachments viewable by project members"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id) OR public.is_admin());

-- INSERT
DROP POLICY IF EXISTS "Task attachments insertable by project members" ON public.task_attachments;
CREATE POLICY "Task attachments insertable by project members"
  ON public.task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_member(project_id) AND auth.uid() = uploader_id);

-- DELETE
DROP POLICY IF EXISTS "Task attachments deletable by uploader or PM" ON public.task_attachments;
CREATE POLICY "Task attachments deletable by uploader or PM"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploader_id OR
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND pm_user_id = auth.uid()) OR
    public.is_admin()
  );

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;
  END IF;
END $$;

-- Private Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/markdown', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/markdown', 'text/plain'];

-- Storage Object Policies (Folder format: {project_id}/{task_id}/{uuid}_{file_name})
DROP POLICY IF EXISTS "Project members can read task attachments" ON storage.objects;
CREATE POLICY "Project members can read task attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-attachments' AND
    (
      public.is_project_member((split_part(name, '/', 1))::uuid) OR
      public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Project members can upload task attachments" ON storage.objects;
CREATE POLICY "Project members can upload task attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-attachments' AND
    public.is_project_member((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS "Uploaders and PMs can delete task attachments" ON storage.objects;
CREATE POLICY "Uploaders and PMs can delete task attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-attachments' AND
    (
      auth.uid() = owner OR
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = (split_part(name, '/', 1))::uuid AND pm_user_id = auth.uid()
      ) OR
      public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. DAILY STREAKS & 365-DAY HEATMAP ENGINE
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Touch user streak helper
CREATE OR REPLACE FUNCTION public.touch_user_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_active DATE;
  v_curr_streak INT;
  v_long_streak INT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_curr_streak, v_long_streak
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If already active today, no change
  IF v_last_active = CURRENT_DATE THEN
    RETURN;
  END IF;

  -- If active yesterday, increment streak
  IF v_last_active = CURRENT_DATE - 1 THEN
    v_curr_streak := v_curr_streak + 1;
    v_long_streak := GREATEST(v_long_streak, v_curr_streak);
  ELSE
    -- Streak reset
    v_curr_streak := 1;
    v_long_streak := GREATEST(v_long_streak, 1);
  END IF;

  UPDATE public.profiles
  SET current_streak = v_curr_streak,
      longest_streak = v_long_streak,
      last_active_date = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Update log_skill_practice to touch streak
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_skill_practice(
  p_skill_name TEXT,
  p_duration_minutes INT,
  p_xp INT DEFAULT NULL,
  p_note TEXT DEFAULT '',
  p_skill_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT := trim(p_skill_name);
  v_slug TEXT;
  v_skill_id UUID;
  v_actual_name TEXT;
  v_deterministic_xp INT;
  v_new_xp INT;
  v_new_level INT;
  v_old_level INT := 1;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_suspended = true) THEN
    RAISE EXCEPTION 'Forbidden: User account is suspended';
  END IF;

  -- 1. Duration Validation (1 to 600 minutes)
  IF p_duration_minutes < 1 OR p_duration_minutes > 600 THEN
    RAISE EXCEPTION 'Practice duration must be between 1 and 600 minutes';
  END IF;

  -- 2. Deterministic XP Calculation (2 XP per minute of deliberate practice)
  v_deterministic_xp := p_duration_minutes * 2;

  -- 3. Match Skill in Catalog (Match by p_skill_id or normalized slug / name)
  IF p_skill_id IS NOT NULL THEN
    SELECT id, name INTO v_skill_id, v_actual_name
    FROM public.skill_catalog
    WHERE id = p_skill_id;
  END IF;

  IF v_skill_id IS NULL THEN
    v_slug := lower(trim(regexp_replace(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g')));
    v_slug := trim(both '-' from v_slug);

    SELECT id, name INTO v_skill_id, v_actual_name
    FROM public.skill_catalog
    WHERE slug = v_slug
       OR lower(trim(name)) = lower(v_clean_name)
       OR slug = lower(v_clean_name)
    LIMIT 1;
  END IF;

  -- If skill does not exist in catalog, reject: require admin approval flow
  IF v_skill_id IS NULL THEN
    RAISE EXCEPTION 'Skill "%" was not found in the global catalog. Please submit a Skill Request for admin review and approval.', v_clean_name;
  END IF;

  -- 4. Retrieve current level for level-up detection
  SELECT level INTO v_old_level
  FROM public.user_skills
  WHERE user_id = v_user_id AND skill_id = v_skill_id;

  IF v_old_level IS NULL THEN
    v_old_level := 1;
  END IF;

  -- 5. Upsert user skills with atomic level calculation
  INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
  VALUES (
    v_user_id,
    v_skill_id,
    v_deterministic_xp,
    public.calculate_skill_level(v_deterministic_xp),
    now()
  )
  ON CONFLICT (user_id, skill_id) DO UPDATE SET
    total_xp = user_skills.total_xp + v_deterministic_xp,
    level = public.calculate_skill_level(user_skills.total_xp + v_deterministic_xp),
    last_practiced_at = now()
  RETURNING total_xp, level INTO v_new_xp, v_new_level;

  -- 6. Insert practice log with deterministic XP
  INSERT INTO public.practice_logs (user_id, skill_id, duration_minutes, xp_gained, note)
  VALUES (v_user_id, v_skill_id, p_duration_minutes, v_deterministic_xp, COALESCE(p_note, ''));

  -- 7. Record in activity ledger
  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_user_id,
    'PRACTICE_LOGGED',
    'Practiced ' || v_actual_name || ' for ' || p_duration_minutes || ' minutes (+' || v_deterministic_xp || ' XP)',
    v_deterministic_xp,
    jsonb_build_object(
      'skill_id', v_skill_id,
      'skill_name', v_actual_name,
      'duration_minutes', p_duration_minutes,
      'new_level', v_new_level,
      'level_up', (v_new_level > v_old_level)
    )
  );

  -- 8. Touch daily consistency streak
  PERFORM public.touch_user_streak(v_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'skill_id', v_skill_id,
    'skill_name', v_actual_name,
    'xp_gained', v_deterministic_xp,
    'total_xp', v_new_xp,
    'level', v_new_level,
    'level_up', (v_new_level > v_old_level)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- Update complete_project_task to touch streak
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_project_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- Update complete_project to touch streak for each member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
  v_member RECORD;
  v_skill RECORD;
  v_xp_reward INT;
  v_members_awarded INT := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_proj
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_proj.pm_user_id != v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only the Project Manager can mark the project completed';
  END IF;

  v_xp_reward := v_proj.completion_xp_reward;

  UPDATE public.projects
  SET status = 'COMPLETED'
  WHERE id = p_project_id;

  IF v_proj.xp_awarded = false THEN
    UPDATE public.projects
    SET xp_awarded = true
    WHERE id = p_project_id;

    INSERT INTO public.project_members (project_id, user_id, invitation_status)
    VALUES (p_project_id, v_proj.pm_user_id, 'ACCEPTED')
    ON CONFLICT (project_id, user_id) DO UPDATE SET invitation_status = 'ACCEPTED';

    FOR v_member IN (
      SELECT DISTINCT user_id
      FROM public.project_members
      WHERE project_id = p_project_id AND invitation_status = 'ACCEPTED'
    ) LOOP
      v_members_awarded := v_members_awarded + 1;

      FOR v_skill IN (
        SELECT s.id, s.name
        FROM public.project_skills ps
        JOIN public.skill_catalog s ON s.id = ps.skill_id
        WHERE ps.project_id = p_project_id
      ) LOOP
        INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
        VALUES (v_member.user_id, v_skill.id, v_xp_reward, public.calculate_skill_level(v_xp_reward), now())
        ON CONFLICT (user_id, skill_id) DO UPDATE SET
          total_xp = user_skills.total_xp + v_xp_reward,
          level = public.calculate_skill_level(user_skills.total_xp + v_xp_reward),
          last_practiced_at = now();

        INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
        VALUES (
          v_member.user_id,
          p_project_id,
          'PROJECT_COMPLETED',
          'Project completed: awarded +' || v_xp_reward || ' XP in "' || v_skill.name || '"',
          v_xp_reward,
          jsonb_build_object('project_id', p_project_id, 'project_name', v_proj.name, 'skill_name', v_skill.name)
        );
      END LOOP;

      -- Touch streak for each rewarded member
      PERFORM public.touch_user_streak(v_member.user_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'members_awarded', v_members_awarded,
    'xp_per_skill', v_xp_reward
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. 365-DAY ACTIVITY HEATMAP RPC (public.get_user_activity_heatmap)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_activity_heatmap(p_days INT DEFAULT 365)
RETURNS TABLE (
  activity_date DATE,
  practice_minutes INT,
  tasks_completed INT,
  xp_earned INT,
  intensity INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_safe_days INT := LEAST(GREATEST(COALESCE(p_days, 365), 7), 365);
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH calendar AS (
    SELECT generate_series(
      (CURRENT_DATE - (v_safe_days - 1))::timestamp,
      CURRENT_DATE::timestamp,
      '1 day'::interval
    )::date AS d
  ),
  daily_practice AS (
    SELECT
      created_at::date AS d,
      COALESCE(SUM(duration_minutes), 0)::INT AS minutes
    FROM public.practice_logs
    WHERE user_id = v_caller_id
      AND created_at >= (CURRENT_DATE - (v_safe_days - 1))::timestamp
    GROUP BY created_at::date
  ),
  daily_tasks AS (
    SELECT
      created_at::date AS d,
      COUNT(*)::INT AS tasks
    FROM public.activity_logs
    WHERE user_id = v_caller_id
      AND event_type = 'TASK_COMPLETED'
      AND created_at >= (CURRENT_DATE - (v_safe_days - 1))::timestamp
    GROUP BY created_at::date
  ),
  daily_xp AS (
    SELECT
      created_at::date AS d,
      COALESCE(SUM(GREATEST(0, xp_delta)), 0)::INT AS xp
    FROM public.activity_logs
    WHERE user_id = v_caller_id
      AND created_at >= (CURRENT_DATE - (v_safe_days - 1))::timestamp
    GROUP BY created_at::date
  )
  SELECT
    c.d AS activity_date,
    COALESCE(dp.minutes, 0) AS practice_minutes,
    COALESCE(dt.tasks, 0) AS tasks_completed,
    COALESCE(dx.xp, 0) AS xp_earned,
    CASE
      WHEN COALESCE(dx.xp, 0) = 0 AND COALESCE(dp.minutes, 0) = 0 AND COALESCE(dt.tasks, 0) = 0 THEN 0
      WHEN COALESCE(dx.xp, 0) BETWEEN 1 AND 25 OR (COALESCE(dx.xp, 0) = 0 AND (COALESCE(dp.minutes, 0) > 0 OR COALESCE(dt.tasks, 0) > 0)) THEN 1
      WHEN COALESCE(dx.xp, 0) BETWEEN 26 AND 75 THEN 2
      WHEN COALESCE(dx.xp, 0) BETWEEN 76 AND 150 THEN 3
      ELSE 4
    END AS intensity
  FROM calendar c
  LEFT JOIN daily_practice dp ON dp.d = c.d
  LEFT JOIN daily_tasks dt ON dt.d = c.d
  LEFT JOIN daily_xp dx ON dx.d = c.d
  ORDER BY c.d ASC;
END;
$$;
