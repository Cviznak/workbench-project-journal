-- ============================================================================
-- Migration 004: Security Hardening & Project Invitation Handshake
-- 1. Close XP & Skill Catalog Bypass in log_skill_practice
-- 2. Project Member Invitation Handshake & RPCs
-- 3. Update complete_project to award only accepted members
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALTER public.project_members to add invitation_status
-- ----------------------------------------------------------------------------
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS invitation_status TEXT NOT NULL DEFAULT 'PENDING'
  CHECK (invitation_status IN ('PENDING', 'ACCEPTED'));

-- Backfill existing project members as ACCEPTED
UPDATE public.project_members
SET invitation_status = 'ACCEPTED';

-- Ensure all project PMs are ACCEPTED
UPDATE public.project_members pm
SET invitation_status = 'ACCEPTED'
FROM public.projects p
WHERE pm.project_id = p.id AND pm.user_id = p.pm_user_id;

-- Index invitation status for fast query filtering
CREATE INDEX IF NOT EXISTS idx_project_members_status ON public.project_members(invitation_status);

-- ----------------------------------------------------------------------------
-- 2. UPDATE is_project_member HELPER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND pm_user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = v_user_id AND invitation_status = 'ACCEPTED'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. UPDATE RLS POLICIES FOR PROJECTS & PROJECT_MEMBERS
-- ----------------------------------------------------------------------------
-- Projects SELECT: PMs, members (accepted or invited), and admins can view project metadata
DROP POLICY IF EXISTS "Projects viewable by members or admins" ON public.projects;
CREATE POLICY "Projects viewable by members or admins"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    pm_user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = projects.id AND user_id = (SELECT auth.uid())
    ) OR
    public.is_admin()
  );

-- Project Members SELECT: users can see their own invites, and project members/admins can view all members
DROP POLICY IF EXISTS "Project members viewable by project members" ON public.project_members;
CREATE POLICY "Project members viewable by project members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    public.is_project_member(project_id) OR
    public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 4. RPC: accept_project_invite
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_project_invite(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj_name TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Verify pending invite exists
  IF NOT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = v_caller_id AND invitation_status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'No pending invitation found for this project';
  END IF;

  -- Update status to ACCEPTED
  UPDATE public.project_members
  SET invitation_status = 'ACCEPTED'
  WHERE project_id = p_project_id AND user_id = v_caller_id;

  -- Fetch project name for audit ledger
  SELECT name INTO v_proj_name FROM public.projects WHERE id = p_project_id;

  -- Record audit event
  INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_caller_id,
    p_project_id,
    'PROJECT_INVITE_ACCEPTED',
    'Accepted invitation to join project "' || COALESCE(v_proj_name, 'Project') || '"',
    0,
    jsonb_build_object('project_id', p_project_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'project_name', v_proj_name
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: decline_project_invite
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decline_project_invite(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj_name TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Verify pending invite exists
  IF NOT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = v_caller_id AND invitation_status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'No pending invitation found for this project';
  END IF;

  -- Fetch project name for audit ledger
  SELECT name INTO v_proj_name FROM public.projects WHERE id = p_project_id;

  -- Remove row from project_members
  DELETE FROM public.project_members
  WHERE project_id = p_project_id AND user_id = v_caller_id AND invitation_status = 'PENDING';

  -- Record audit event
  INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_caller_id,
    p_project_id,
    'PROJECT_INVITE_DECLINED',
    'Declined invitation to join project "' || COALESCE(v_proj_name, 'Project') || '"',
    0,
    jsonb_build_object('project_id', p_project_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. UPDATE complete_project RPC (Award only ACCEPTED members)
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

  -- Lock project row
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

  -- Update status
  UPDATE public.projects
  SET status = 'COMPLETED'
  WHERE id = p_project_id;

  -- If XP not awarded yet, distribute team-wide payout to ACCEPTED members only
  IF v_proj.xp_awarded = false THEN
    UPDATE public.projects
    SET xp_awarded = true
    WHERE id = p_project_id;

    -- Ensure PM is included in members as ACCEPTED
    INSERT INTO public.project_members (project_id, user_id, invitation_status)
    VALUES (p_project_id, v_proj.pm_user_id, 'ACCEPTED')
    ON CONFLICT (project_id, user_id) DO UPDATE SET invitation_status = 'ACCEPTED';

    -- Loop through all ACCEPTED members
    FOR v_member IN (
      SELECT DISTINCT user_id
      FROM public.project_members
      WHERE project_id = p_project_id AND invitation_status = 'ACCEPTED'
    ) LOOP
      v_members_awarded := v_members_awarded + 1;

      -- Loop through all skills linked to this project
      FOR v_skill IN (
        SELECT s.id, s.name
        FROM public.project_skills ps
        JOIN public.skill_catalog s ON s.id = ps.skill_id
        WHERE ps.project_id = p_project_id
      ) LOOP
        -- Auto-unlock skill for member if needed and grant XP
        INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
        VALUES (v_member.user_id, v_skill.id, v_xp_reward, public.calculate_skill_level(v_xp_reward), now())
        ON CONFLICT (user_id, skill_id) DO UPDATE SET
          total_xp = user_skills.total_xp + v_xp_reward,
          level = public.calculate_skill_level(user_skills.total_xp + v_xp_reward),
          last_practiced_at = now();

        -- Log activity
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
-- 7. SECURE log_skill_practice RPC (Zero Client Trust for XP & Skill Creation)
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
