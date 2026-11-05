-- Migration 018: Public Launch, Buy Me a Coffee Support & Project Invite Emails
-- Version: 2.1.0
-- Rules: 100% pure LF, never mention the forbidden word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Support URL on Profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS support_url TEXT DEFAULT '';

-- Constraint ensuring valid creator tip link (Buy Me a Coffee, Ko-fi, Patreon)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_support_url'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_support_url
    CHECK (support_url = '' OR support_url ~ '^https://(www\.)?(buymeacoffee\.com|ko-fi\.com|patreon\.com)/[A-Za-z0-9_.-]+/?$');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Anonymous (anon role) Read-Only Showcase Permissions
-- ----------------------------------------------------------------------------
-- Grant SELECT permissions to anon for public showcase browsing
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.skill_catalog TO anon;
GRANT SELECT ON public.user_skills TO anon;
GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.project_tasks TO anon;
GRANT SELECT ON public.project_skills TO anon;
GRANT SELECT ON public.project_members TO anon;

-- Policies for public reading by anon:
DROP POLICY IF EXISTS "Public showcase profiles readable by anon" ON public.profiles;
CREATE POLICY "Public showcase profiles readable by anon"
  ON public.profiles FOR SELECT
  TO anon
  USING (is_suspended = false);

DROP POLICY IF EXISTS "Skill catalog readable by anon" ON public.skill_catalog;
CREATE POLICY "Skill catalog readable by anon"
  ON public.skill_catalog FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "User skills readable by anon" ON public.user_skills;
CREATE POLICY "User skills readable by anon"
  ON public.user_skills FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Community posts readable by anon" ON public.community_posts;
CREATE POLICY "Community posts readable by anon"
  ON public.community_posts FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Post likes readable by anon" ON public.post_likes;
CREATE POLICY "Post likes readable by anon"
  ON public.post_likes FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Post comments readable by anon" ON public.post_comments;
CREATE POLICY "Post comments readable by anon"
  ON public.post_comments FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public projects readable by anon" ON public.projects;
CREATE POLICY "Public projects readable by anon"
  ON public.projects FOR SELECT
  TO anon
  USING (is_public = true);

DROP POLICY IF EXISTS "Public project tasks readable by anon" ON public.project_tasks;
CREATE POLICY "Public project tasks readable by anon"
  ON public.project_tasks FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.is_public = true));

DROP POLICY IF EXISTS "Public project skills readable by anon" ON public.project_skills;
CREATE POLICY "Public project skills readable by anon"
  ON public.project_skills FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_skills.project_id AND p.is_public = true));

DROP POLICY IF EXISTS "Public project members readable by anon" ON public.project_members;
CREATE POLICY "Public project members readable by anon"
  ON public.project_members FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND p.is_public = true));

-- ----------------------------------------------------------------------------
-- 3. Project Invite Email Payload RPC
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
