-- Migration 014: Teammate Search, Safe Invites, and Project Management RPCs
-- Version: 1.8.0
-- Rules: 100% pure LF line endings, never mention the J-word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. RPC: search_makers_for_invite
-- ----------------------------------------------------------------------------
-- Allows authenticated users to safely search non-suspended profiles by username
-- or display_name, returning membership status for the specified project.
-- Never exposes sensitive fields like email or settings_json.
CREATE OR REPLACE FUNCTION public.search_makers_for_invite(
  p_query TEXT,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  already_member BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_clean_query TEXT := trim(COALESCE(p_query, ''));
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Require at least 1 character to search
  IF length(v_clean_query) < 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    CASE
      WHEN p_project_id IS NOT NULL THEN (
        EXISTS (
          SELECT 1 FROM public.projects pr
          WHERE pr.id = p_project_id AND pr.pm_user_id = p.id
        )
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p_project_id AND pm.user_id = p.id
        )
      )
      ELSE false
    END AS already_member
  FROM public.profiles p
  WHERE p.is_suspended = false
    AND p.id <> v_caller_id
    AND (
      p.username ILIKE '%' || v_clean_query || '%'
      OR p.display_name ILIKE '%' || v_clean_query || '%'
    )
  ORDER BY
    CASE
      WHEN lower(p.username) = lower(v_clean_query) THEN 1
      WHEN lower(p.display_name) = lower(v_clean_query) THEN 2
      WHEN lower(p.username) LIKE lower(v_clean_query) || '%' THEN 3
      WHEN lower(p.display_name) LIKE lower(v_clean_query) || '%' THEN 4
      ELSE 5
    END,
    p.username ASC
  LIMIT 8;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. RPC: invite_user_to_project
-- ----------------------------------------------------------------------------
-- Callable only by the project PM to invite registered teammates.
-- Inserts or updates row in public.project_members with status 'PENDING'.
CREATE OR REPLACE FUNCTION public.invite_user_to_project(
  p_project_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
  v_target RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = p_project_id;
  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_proj.pm_user_id != v_caller_id THEN
    RAISE EXCEPTION 'Forbidden: Only the Project Manager can invite teammates';
  END IF;

  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot invite yourself (you are the Project Manager)';
  END IF;

  SELECT id, username, display_name, is_suspended INTO v_target
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found';
  END IF;

  IF v_target.is_suspended THEN
    RAISE EXCEPTION 'Cannot invite suspended user';
  END IF;

  -- Check if already an accepted member
  IF EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_target_user_id AND invitation_status = 'ACCEPTED'
  ) THEN
    RAISE EXCEPTION 'User is already an active member of this project';
  END IF;

  -- Upsert invite row as PENDING
  INSERT INTO public.project_members (project_id, user_id, invitation_status)
  VALUES (p_project_id, p_target_user_id, 'PENDING')
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET invitation_status = 'PENDING';

  -- Log invite to audit activity ledger
  INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_caller_id,
    p_project_id,
    'MEMBER_INVITED',
    'Invited @' || v_target.username || ' to project "' || v_proj.name || '"',
    0,
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_proj.name,
      'target_user_id', p_target_user_id,
      'target_username', v_target.username
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'target_user_id', p_target_user_id,
    'target_username', v_target.username,
    'invitation_status', 'PENDING'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RPC: remove_project_member
-- ----------------------------------------------------------------------------
-- Callable by the project PM (to remove member or cancel invite) OR by the member
-- themselves (to voluntarily leave the project, unless they are the PM).
CREATE OR REPLACE FUNCTION public.remove_project_member(
  p_project_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
  v_target RECORD;
  v_unassigned_count INT := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = p_project_id;
  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- PM cannot leave the project without transferring PM role first
  IF p_target_user_id = v_proj.pm_user_id THEN
    RAISE EXCEPTION 'Project Manager cannot leave the project. Transfer the PM role first.';
  END IF;

  -- Caller must be either the PM or the target user leaving
  IF v_caller_id != v_proj.pm_user_id AND v_caller_id != p_target_user_id THEN
    RAISE EXCEPTION 'Forbidden: Only the Project Manager or the member themselves can perform this action';
  END IF;

  SELECT id, username, display_name INTO v_target
  FROM public.profiles
  WHERE id = p_target_user_id;

  -- 1. Unassign all incomplete tasks assigned to this user on this project
  UPDATE public.project_tasks
  SET assignee_id = NULL,
      updated_at = now()
  WHERE project_id = p_project_id
    AND assignee_id = p_target_user_id
    AND status != 'DONE';
  GET DIAGNOSTICS v_unassigned_count = ROW_COUNT;

  -- 2. Remove member row
  DELETE FROM public.project_members
  WHERE project_id = p_project_id AND user_id = p_target_user_id;

  -- 3. Log event
  IF v_caller_id = v_proj.pm_user_id THEN
    INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
    VALUES (
      v_caller_id,
      p_project_id,
      'MEMBER_REMOVED',
      'Removed @' || COALESCE(v_target.username, 'member') || ' from project "' || v_proj.name || '"',
      0,
      jsonb_build_object(
        'project_id', p_project_id,
        'target_user_id', p_target_user_id,
        'unassigned_tasks', v_unassigned_count
      )
    );
  ELSE
    INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
    VALUES (
      v_caller_id,
      p_project_id,
      'MEMBER_LEFT',
      '@' || COALESCE(v_target.username, 'member') || ' left project "' || v_proj.name || '"',
      0,
      jsonb_build_object(
        'project_id', p_project_id,
        'target_user_id', p_target_user_id,
        'unassigned_tasks', v_unassigned_count
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'removed_user_id', p_target_user_id,
    'unassigned_tasks', v_unassigned_count
  );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.search_makers_for_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_user_to_project(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_project_member(UUID, UUID) TO authenticated;
