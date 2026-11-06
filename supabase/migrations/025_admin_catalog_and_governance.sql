-- ==============================================================================
-- Migration 025: Admin Catalog & Governance Suite (Workbench v2.8)
--
-- 1. Helper Security & Skill Catalog Administration:
--    - admin_upsert_skill: Create or update global skills.
--    - admin_merge_skills: Safely combine duplicate skills, transferring XP,
--      practice logs, tasks, and posts without losing maker progress.
--    - admin_delete_skill: Delete unused skills (fails gracefully if makers have XP).
--    - get_skill_catalog_with_usage: Query all catalog skills with user & log counts.
-- 2. User Feedback Replies:
--    - Alter public.user_feedback to add admin_reply and replied_at.
--    - admin_reply_to_feedback: Save reply and dispatch in-app notification.
-- 3. Global System Announcements:
--    - admin_broadcast_notification: Broadcast in-app notification to all active makers.
-- 4. Community & Showcase Moderation:
--    - admin_unpublish_project: Remove project from public showcase.
--    - admin_delete_community_post: Remove inappropriate community post.
--    - admin_delete_post_comment: Remove inappropriate post comment.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ALTER USER_FEEDBACK FOR ADMIN REPLIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_feedback
  ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT '' CHECK (char_length(admin_reply) <= 2000),
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 2. RPC: admin_upsert_skill
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_skill(
  p_skill_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT '',
  p_slug TEXT DEFAULT '',
  p_category TEXT DEFAULT 'General'
)
RETURNS public.skill_catalog
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_slug TEXT;
  v_category TEXT;
  v_skill public.skill_catalog;
BEGIN
  -- Security check: Caller must be an active ADMIN or ROOT_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  v_name := trim(COALESCE(p_name, ''));
  v_slug := lower(trim(COALESCE(p_slug, '')));
  v_category := trim(COALESCE(p_category, 'General'));

  IF char_length(v_name) < 2 OR char_length(v_name) > 60 THEN
    RAISE EXCEPTION 'Skill name must be between 2 and 60 characters.';
  END IF;

  IF char_length(v_slug) < 2 OR char_length(v_slug) > 60 OR v_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Skill slug must be lowercase alphanumeric with hyphens (e.g. 3d-printing).';
  END IF;

  IF char_length(v_category) < 2 OR char_length(v_category) > 60 THEN
    RAISE EXCEPTION 'Category must be between 2 and 60 characters.';
  END IF;

  IF p_skill_id IS NULL THEN
    -- Check uniqueness of slug
    IF EXISTS (SELECT 1 FROM public.skill_catalog WHERE slug = v_slug) THEN
      RAISE EXCEPTION 'A skill with slug "%" already exists.', v_slug;
    END IF;

    INSERT INTO public.skill_catalog (name, slug, category)
    VALUES (v_name, v_slug, v_category)
    RETURNING * INTO v_skill;

    INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
    VALUES (
      auth.uid(),
      'ADMIN_SKILL_UPSERTED',
      'Admin created global skill: ' || v_skill.name,
      0,
      jsonb_build_object(
        'skill_id', v_skill.id,
        'name', v_skill.name,
        'slug', v_skill.slug,
        'category', v_skill.category,
        'action', 'CREATE'
      )
    );
  ELSE
    -- Check uniqueness of slug excluding current skill
    IF EXISTS (SELECT 1 FROM public.skill_catalog WHERE slug = v_slug AND id != p_skill_id) THEN
      RAISE EXCEPTION 'Another skill with slug "%" already exists.', v_slug;
    END IF;

    UPDATE public.skill_catalog
    SET name = v_name,
        slug = v_slug,
        category = v_category
    WHERE id = p_skill_id
    RETURNING * INTO v_skill;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Skill not found with ID %.', p_skill_id;
    END IF;

    INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
    VALUES (
      auth.uid(),
      'ADMIN_SKILL_UPSERTED',
      'Admin updated global skill: ' || v_skill.name,
      0,
      jsonb_build_object(
        'skill_id', v_skill.id,
        'name', v_skill.name,
        'slug', v_skill.slug,
        'category', v_skill.category,
        'action', 'UPDATE'
      )
    );
  END IF;

  RETURN v_skill;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_upsert_skill FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_skill TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. RPC: admin_merge_skills
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_merge_skills(
  p_source_skill_id UUID,
  p_target_skill_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.skill_catalog;
  v_target public.skill_catalog;
  v_rec RECORD;
  v_target_user_skill public.user_skills;
  v_new_xp INT;
  v_new_level INT;
  v_users_affected INT := 0;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  IF p_source_skill_id IS NULL OR p_target_skill_id IS NULL THEN
    RAISE EXCEPTION 'Source and target skill IDs are required.';
  END IF;

  IF p_source_skill_id = p_target_skill_id THEN
    RAISE EXCEPTION 'Source and target skill cannot be the same.';
  END IF;

  SELECT * INTO v_source FROM public.skill_catalog WHERE id = p_source_skill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source skill not found.';
  END IF;

  SELECT * INTO v_target FROM public.skill_catalog WHERE id = p_target_skill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target skill not found.';
  END IF;

  -- 1. Merge user_skills records
  FOR v_rec IN (SELECT * FROM public.user_skills WHERE skill_id = p_source_skill_id) LOOP
    v_users_affected := v_users_affected + 1;

    SELECT * INTO v_target_user_skill
    FROM public.user_skills
    WHERE user_id = v_rec.user_id AND skill_id = p_target_skill_id;

    IF FOUND THEN
      v_new_xp := v_target_user_skill.total_xp + v_rec.total_xp;
      v_new_level := floor(0.1 * sqrt(v_new_xp))::int + 1;

      UPDATE public.user_skills
      SET total_xp = v_new_xp,
          level = v_new_level,
          last_practiced_at = GREATEST(COALESCE(v_target_user_skill.last_practiced_at, v_rec.last_practiced_at), v_rec.last_practiced_at)
      WHERE id = v_target_user_skill.id;

      DELETE FROM public.user_skills WHERE id = v_rec.id;
    ELSE
      UPDATE public.user_skills
      SET skill_id = p_target_skill_id
      WHERE id = v_rec.id;
    END IF;
  END LOOP;

  -- 2. Re-point practice_logs, project_tasks, community_posts
  UPDATE public.practice_logs
  SET skill_id = p_target_skill_id
  WHERE skill_id = p_source_skill_id;

  UPDATE public.project_tasks
  SET skill_id = p_target_skill_id
  WHERE skill_id = p_source_skill_id;

  UPDATE public.community_posts
  SET skill_id = p_target_skill_id
  WHERE skill_id = p_source_skill_id;

  -- 3. Re-point project_skills
  INSERT INTO public.project_skills (project_id, skill_id)
  SELECT project_id, p_target_skill_id
  FROM public.project_skills
  WHERE skill_id = p_source_skill_id
  ON CONFLICT (project_id, skill_id) DO NOTHING;

  DELETE FROM public.project_skills WHERE skill_id = p_source_skill_id;

  -- 4. Delete source skill from catalog
  DELETE FROM public.skill_catalog WHERE id = p_source_skill_id;

  -- 5. Audit Log
  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_SKILL_MERGED',
    'Admin merged skill ' || v_source.name || ' into ' || v_target.name,
    0,
    jsonb_build_object(
      'source_skill_id', p_source_skill_id,
      'source_name', v_source.name,
      'target_skill_id', p_target_skill_id,
      'target_name', v_target.name,
      'users_affected', v_users_affected
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'source_name', v_source.name,
    'target_name', v_target.name,
    'users_affected', v_users_affected
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_merge_skills FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_merge_skills TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. RPC: admin_delete_skill
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_skill(
  p_skill_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill public.skill_catalog;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT * INTO v_skill FROM public.skill_catalog WHERE id = p_skill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skill not found.';
  END IF;

  -- Verify no makers have unlocked XP or practice logs for this skill
  IF EXISTS (SELECT 1 FROM public.user_skills WHERE skill_id = p_skill_id)
     OR EXISTS (SELECT 1 FROM public.practice_logs WHERE skill_id = p_skill_id) THEN
    RAISE EXCEPTION 'Cannot delete skill: Makers currently have unlocked XP or practice logs for "%". Please use "Merge Skill" instead to preserve maker progress.', v_skill.name;
  END IF;

  -- Clean up any remaining references in project_skills, tasks, and posts
  DELETE FROM public.project_skills WHERE skill_id = p_skill_id;
  UPDATE public.project_tasks SET skill_id = NULL WHERE skill_id = p_skill_id;
  UPDATE public.community_posts SET skill_id = NULL WHERE skill_id = p_skill_id;

  DELETE FROM public.skill_catalog WHERE id = p_skill_id;

  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_SKILL_DELETED',
    'Admin deleted unused skill: ' || v_skill.name,
    0,
    jsonb_build_object(
      'skill_id', p_skill_id,
      'name', v_skill.name,
      'slug', v_skill.slug,
      'category', v_skill.category
    )
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_skill FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_skill TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. RPC: get_skill_catalog_with_usage
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_skill_catalog_with_usage()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  users_count BIGINT,
  practice_logs_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sc.id,
    sc.slug,
    sc.name,
    sc.category,
    sc.created_at,
    COALESCE(us.cnt, 0) AS users_count,
    COALESCE(pl.cnt, 0) AS practice_logs_count
  FROM public.skill_catalog sc
  LEFT JOIN (
    SELECT skill_id, COUNT(*) AS cnt
    FROM public.user_skills
    GROUP BY skill_id
  ) us ON us.skill_id = sc.id
  LEFT JOIN (
    SELECT skill_id, COUNT(*) AS cnt
    FROM public.practice_logs
    GROUP BY skill_id
  ) pl ON pl.skill_id = sc.id
  ORDER BY sc.category ASC, sc.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_skill_catalog_with_usage TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 6. RPC: admin_reply_to_feedback
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reply_to_feedback(
  p_feedback_id UUID,
  p_status TEXT,
  p_reply TEXT
)
RETURNS public.user_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fb public.user_feedback;
  v_reply TEXT;
  v_status TEXT;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  v_status := upper(trim(COALESCE(p_status, 'OPEN')));
  IF v_status NOT IN ('OPEN', 'REVIEWED', 'RESOLVED') THEN
    RAISE EXCEPTION 'Invalid status. Must be OPEN, REVIEWED, or RESOLVED.';
  END IF;

  v_reply := trim(COALESCE(p_reply, ''));
  IF char_length(v_reply) > 2000 THEN
    RAISE EXCEPTION 'Admin reply must not exceed 2000 characters.';
  END IF;

  UPDATE public.user_feedback
  SET status = v_status,
      admin_reply = v_reply,
      replied_at = CASE WHEN char_length(v_reply) > 0 THEN now() ELSE replied_at END
  WHERE id = p_feedback_id
  RETURNING * INTO v_fb;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback record not found.';
  END IF;

  -- Notify user if they are linked and reply is non-empty
  IF v_fb.user_id IS NOT NULL AND char_length(v_reply) > 0 THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      title,
      body,
      link_url
    ) VALUES (
      v_fb.user_id,
      auth.uid(),
      'FEEDBACK_REPLIED',
      'Admin replied to your ' || lower(v_fb.category) || ' report',
      left(v_reply, 200),
      '/dashboard'
    );
  END IF;

  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_FEEDBACK_REPLIED',
    'Admin updated feedback #' || substring(p_feedback_id::text, 1, 8) || ' (' || v_status || ')',
    0,
    jsonb_build_object(
      'feedback_id', p_feedback_id,
      'status', v_status,
      'has_reply', char_length(v_reply) > 0
    )
  );

  RETURN v_fb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reply_to_feedback FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_reply_to_feedback TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. RPC: admin_broadcast_notification
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  p_title TEXT,
  p_body TEXT,
  p_link_url TEXT DEFAULT '/dashboard'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_count INT := 0;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  v_title := trim(COALESCE(p_title, ''));
  v_body := trim(COALESCE(p_body, ''));
  v_link := COALESCE(NULLIF(trim(p_link_url), ''), '/dashboard');

  IF char_length(v_title) < 3 OR char_length(v_title) > 120 THEN
    RAISE EXCEPTION 'Announcement title must be between 3 and 120 characters.';
  END IF;

  IF char_length(v_body) < 5 OR char_length(v_body) > 1000 THEN
    RAISE EXCEPTION 'Announcement body must be between 5 and 1000 characters.';
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    title,
    body,
    link_url
  )
  SELECT
    id,
    auth.uid(),
    'SYSTEM_ANNOUNCEMENT',
    v_title,
    v_body,
    v_link
  FROM public.profiles
  WHERE is_suspended = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_BROADCAST_SENT',
    'Admin broadcasted system announcement: ' || v_title,
    0,
    jsonb_build_object(
      'title', v_title,
      'body', v_body,
      'link_url', v_link,
      'recipients_count', v_count
    )
  );

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_broadcast_notification FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. RPC: admin_unpublish_project
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unpublish_project(
  p_project_id UUID
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj public.projects;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  UPDATE public.projects
  SET is_public = false,
      updated_at = now()
  WHERE id = p_project_id
  RETURNING * INTO v_proj;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_PROJECT_UNPUBLISHED',
    'Admin unpublished project from public showcase: ' || v_proj.title,
    0,
    jsonb_build_object('project_id', v_proj.id, 'title', v_proj.title)
  );

  RETURN v_proj;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_unpublish_project FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_unpublish_project TO authenticated;

-- ------------------------------------------------------------------------------
-- 9. RPC: admin_delete_community_post
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_community_post(
  p_post_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.community_posts;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT * INTO v_post FROM public.community_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community post not found.';
  END IF;

  DELETE FROM public.community_posts WHERE id = p_post_id;

  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_POST_DELETED',
    'Admin deleted community post #' || substring(p_post_id::text, 1, 8),
    0,
    jsonb_build_object(
      'post_id', p_post_id,
      'author_id', v_post.author_id,
      'excerpt', left(v_post.content_md, 100)
    )
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_community_post FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_community_post TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. RPC: admin_delete_post_comment
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_post_comment(
  p_comment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comm public.post_comments;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT * INTO v_comm FROM public.post_comments WHERE id = p_comment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found.';
  END IF;

  DELETE FROM public.post_comments WHERE id = p_comment_id;

  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_COMMENT_DELETED',
    'Admin deleted post comment #' || substring(p_comment_id::text, 1, 8),
    0,
    jsonb_build_object(
      'comment_id', p_comment_id,
      'post_id', v_comm.post_id,
      'user_id', v_comm.user_id,
      'excerpt', left(v_comm.comment_text, 100)
    )
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_post_comment FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_post_comment TO authenticated;
