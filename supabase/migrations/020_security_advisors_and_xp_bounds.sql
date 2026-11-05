-- Migration 020: Security Advisors Remediation, Anti-Spam & XP Bounds Hardening
-- Version: 2.2.1
-- Rules: 100% pure LF, never mention the forbidden word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Fix Mutable search_path on calculate_skill_level
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_skill_level(p_xp INT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_xp <= 0 THEN
    RETURN 1;
  END IF;
  RETURN LEAST(100, FLOOR(SQRT(p_xp::numeric / 10.0))::INT + 1);
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Revoke Public / Anon EXECUTE on all Public Schema Functions
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Cap XP Exploit Vulnerability (Economic Game Balancing)
-- ----------------------------------------------------------------------------
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_completion_xp_reward_check;

ALTER TABLE public.projects
ADD CONSTRAINT projects_completion_xp_reward_check 
CHECK (completion_xp_reward BETWEEN 0 AND 5000);

ALTER TABLE public.project_tasks 
DROP CONSTRAINT IF EXISTS project_tasks_xp_reward_check;

ALTER TABLE public.project_tasks
ADD CONSTRAINT project_tasks_xp_reward_check 
CHECK (xp_reward BETWEEN 0 AND 1000);

-- ----------------------------------------------------------------------------
-- 4. Input Length & Buffer Overrun Bounds
-- ----------------------------------------------------------------------------
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS chk_projects_name_length;

ALTER TABLE public.projects
ADD CONSTRAINT chk_projects_name_length 
CHECK (char_length(trim(name)) BETWEEN 1 AND 100);

ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS chk_projects_desc_length;

ALTER TABLE public.projects
ADD CONSTRAINT chk_projects_desc_length 
CHECK (description IS NULL OR char_length(description) <= 5000);

ALTER TABLE public.project_tasks
DROP CONSTRAINT IF EXISTS chk_project_tasks_title_length;

ALTER TABLE public.project_tasks
ADD CONSTRAINT chk_project_tasks_title_length 
CHECK (char_length(trim(title)) BETWEEN 1 AND 200);

ALTER TABLE public.project_tasks
DROP CONSTRAINT IF EXISTS chk_project_tasks_desc_length;

ALTER TABLE public.project_tasks
ADD CONSTRAINT chk_project_tasks_desc_length 
CHECK (description IS NULL OR char_length(description) <= 10000);

-- ----------------------------------------------------------------------------
-- 5. Anti-Spam Rate Limiting on Project Invite Email RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_invite_email_payload(
  p_project_id UUID,
  p_target_user_id UUID
)
RETURNS TABLE (
  invitee_email TEXT,
  invitee_name TEXT,
  project_name TEXT,
  inviter_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
  v_inviter RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = p_project_id;
  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Caller must be PM or an Admin
  IF v_proj.pm_user_id <> v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only the Project Manager can dispatch invitation alerts';
  END IF;

  -- Anti-spam cooldown: Check if an invitation notification was sent in the last 15 minutes
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE recipient_id = p_target_user_id
      AND actor_id = v_caller_id
      AND notification_type = 'PROJECT_INVITE'
      AND link_url LIKE ('%' || p_project_id::TEXT || '%')
      AND created_at > now() - INTERVAL '15 minutes'
  ) THEN
    RAISE EXCEPTION 'An invitation alert was already dispatched to this maker recently. Please wait before re-sending.';
  END IF;

  -- Fetch inviter
  SELECT display_name, username INTO v_inviter FROM public.profiles WHERE id = v_caller_id;

  -- Fetch invitee profile and user
  RETURN QUERY
  SELECT
    u.email::TEXT AS invitee_email,
    COALESCE(p.display_name, p.username, 'Maker')::TEXT AS invitee_name,
    v_proj.name::TEXT AS project_name,
    COALESCE(v_inviter.display_name, v_inviter.username, 'A Project Manager')::TEXT AS inviter_username
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_target_user_id
    AND p.is_suspended = false
    AND COALESCE((p.settings_json->>'email_project_invites')::boolean, true) = true;
END;
$$;
