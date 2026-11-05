-- Migration 013: Fix Project Privacy, Atomic Project Creation, and Latency Optimization
-- Version: 1.7.1
-- Rules: 100% pure LF, never mention the J-word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Fast, Indexed is_project_member Helper Function
-- ----------------------------------------------------------------------------
-- Recreate public.is_project_member as a SECURITY DEFINER STABLE SQL function.
-- Returns true ONLY if caller is project PM or has an ACCEPTED or PENDING invite.
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id
        AND p.pm_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p_project_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.invitation_status IN ('ACCEPTED', 'PENDING')
    )
  );
$$;

-- Performance indexes for is_project_member lookup
CREATE INDEX IF NOT EXISTS idx_projects_pm_user_id ON public.projects(pm_user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_lookup ON public.project_members(project_id, user_id, invitation_status);

-- ----------------------------------------------------------------------------
-- 2. Lock Down public.projects RLS (Strict Membership Only - No Admin Bypass)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Projects viewable by members or admins" ON public.projects;
DROP POLICY IF EXISTS "Projects viewable by members only" ON public.projects;

CREATE POLICY "Projects viewable by members only"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    pm_user_id = (SELECT auth.uid()) OR
    public.is_project_member(id)
  );

-- ----------------------------------------------------------------------------
-- 3. Lock Down Project-Related Tables (Strict Membership Only)
-- ----------------------------------------------------------------------------

-- A. project_members
DROP POLICY IF EXISTS "Project members viewable by project members" ON public.project_members;
CREATE POLICY "Project members viewable by project members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS "Project PM can update members" ON public.project_members;
CREATE POLICY "Project PM can update members"
  ON public.project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id AND p.pm_user_id = (SELECT auth.uid())
    ) OR user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id AND p.pm_user_id = (SELECT auth.uid())
    ) OR user_id = (SELECT auth.uid())
  );

-- B. project_skills
DROP POLICY IF EXISTS "Project skills viewable by project members" ON public.project_skills;
DROP POLICY IF EXISTS "Project PM can manage project skills" ON public.project_skills;

CREATE POLICY "Project skills viewable by project members"
  ON public.project_skills FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "Project PM can manage project skills"
  ON public.project_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_skills.project_id AND p.pm_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_skills.project_id AND p.pm_user_id = (SELECT auth.uid())
    )
  );

-- C. project_tasks
DROP POLICY IF EXISTS "Tasks viewable by project members" ON public.project_tasks;
CREATE POLICY "Tasks viewable by project members"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

-- D. task_comments
DROP POLICY IF EXISTS "Task comments viewable by project members" ON public.task_comments;
CREATE POLICY "Task comments viewable by project members"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "Task comments deletable by author or PM" ON public.task_comments;
CREATE POLICY "Task comments deletable by author or PM"
  ON public.task_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = task_comments.project_id AND p.pm_user_id = auth.uid()
    )
  );

-- E. task_attachments
DROP POLICY IF EXISTS "Task attachments viewable by project members" ON public.task_attachments;
CREATE POLICY "Task attachments viewable by project members"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "Task attachments deletable by uploader or PM" ON public.task_attachments;
CREATE POLICY "Task attachments deletable by uploader or PM"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploader_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = task_attachments.project_id AND p.pm_user_id = auth.uid()
    )
  );

-- F. task_materials
DROP POLICY IF EXISTS "Project members can view task materials" ON public.task_materials;
CREATE POLICY "Project members can view task materials"
  ON public.task_materials FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

-- G. Storage attachments deletion
DROP POLICY IF EXISTS "Uploaders and PMs can delete task attachments" ON storage.objects;
CREATE POLICY "Uploaders and PMs can delete task attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-attachments' AND (
      auth.uid() = owner OR
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = (split_part(storage.objects.name, '/', 1))::uuid
          AND p.pm_user_id = auth.uid()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Atomic RPC: create_maker_project
-- ----------------------------------------------------------------------------
-- Atomically inserts project, PM membership, invited members, and skills
CREATE OR REPLACE FUNCTION public.create_maker_project(
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_completion_xp_reward INT DEFAULT 100,
  p_skill_ids UUID[] DEFAULT '{}'::uuid[],
  p_member_user_ids UUID[] DEFAULT '{}'::uuid[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_clean_name TEXT := trim(p_name);
  v_project_id UUID;
  v_skill_id UUID;
  v_member_id UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF length(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Project name must be at least 2 characters long';
  END IF;

  -- 1. Insert into public.projects
  INSERT INTO public.projects (
    name,
    description,
    pm_user_id,
    status,
    completion_xp_reward
  ) VALUES (
    v_clean_name,
    COALESCE(p_description, ''),
    v_caller_id,
    'ACTIVE',
    COALESCE(p_completion_xp_reward, 100)
  ) RETURNING id INTO v_project_id;

  -- 2. Ensure PM is in public.project_members with status ACCEPTED
  INSERT INTO public.project_members (project_id, user_id, invitation_status)
  VALUES (v_project_id, v_caller_id, 'ACCEPTED')
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET invitation_status = 'ACCEPTED';

  -- 3. Insert additional invited members as PENDING (if provided)
  IF p_member_user_ids IS NOT NULL AND array_length(p_member_user_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_member_user_ids LOOP
      IF v_member_id IS NOT NULL AND v_member_id <> v_caller_id THEN
        INSERT INTO public.project_members (project_id, user_id, invitation_status)
        VALUES (v_project_id, v_member_id, 'PENDING')
        ON CONFLICT (project_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 4. Insert skills into public.project_skills
  IF p_skill_ids IS NOT NULL AND array_length(p_skill_ids, 1) > 0 THEN
    FOREACH v_skill_id IN ARRAY p_skill_ids LOOP
      IF v_skill_id IS NOT NULL THEN
        INSERT INTO public.project_skills (project_id, skill_id)
        VALUES (v_project_id, v_skill_id)
        ON CONFLICT (project_id, skill_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 5. Record activity log
  INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_caller_id,
    v_project_id,
    'PROJECT_CREATED',
    'Created project: "' || v_clean_name || '"',
    0,
    jsonb_build_object('project_id', v_project_id, 'project_name', v_clean_name)
  );

  RETURN v_project_id;
END;
$$;
