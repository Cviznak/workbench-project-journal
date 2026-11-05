-- Migration 019: Threaded Comments, Comment Likes, Strict Project Isolation & Security Hardening
-- Version: 2.2.0
-- Rules: 100% pure LF, never mention the forbidden word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Threaded Comments on Community Posts (public.post_comments)
-- ----------------------------------------------------------------------------
ALTER TABLE public.post_comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

ALTER TABLE public.post_comments
ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0 CHECK (likes_count >= 0);

CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_comment_id);

-- ----------------------------------------------------------------------------
-- 2. Threaded Comments on Task Discussions (public.task_comments)
-- ----------------------------------------------------------------------------
ALTER TABLE public.task_comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON public.task_comments(parent_comment_id);

-- ----------------------------------------------------------------------------
-- 3. Comment Likes Table (public.comment_likes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON public.comment_likes(user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment likes viewable by all" ON public.comment_likes;
CREATE POLICY "Comment likes viewable by all"
  ON public.comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Comment likes insertable by self" ON public.comment_likes;
CREATE POLICY "Comment likes insertable by self"
  ON public.comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Comment likes deletable by self" ON public.comment_likes;
CREATE POLICY "Comment likes deletable by self"
  ON public.comment_likes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT ON public.comment_likes TO anon;

-- ----------------------------------------------------------------------------
-- 4. Atomic Comment Like Toggle RPC (public.toggle_comment_like)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_new_count INT;
  v_comment RECORD;
  v_actor_profile RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM set_config('workbench.internal_rpc', 'true', true);

  -- Verify comment exists
  SELECT * INTO v_comment FROM public.post_comments WHERE id = p_comment_id;
  IF v_comment.id IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.comment_likes
    WHERE comment_id = p_comment_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.comment_likes
    WHERE comment_id = p_comment_id AND user_id = v_user_id;

    UPDATE public.post_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = p_comment_id
    RETURNING likes_count INTO v_new_count;

    RETURN jsonb_build_object('liked', false, 'likes_count', v_new_count);
  ELSE
    INSERT INTO public.comment_likes(comment_id, user_id)
    VALUES (p_comment_id, v_user_id);

    UPDATE public.post_comments
    SET likes_count = likes_count + 1
    WHERE id = p_comment_id
    RETURNING likes_count INTO v_new_count;

    -- Trigger notification if author is not the liker
    IF v_comment.user_id <> v_user_id THEN
      SELECT username, display_name INTO v_actor_profile FROM public.profiles WHERE id = v_user_id;
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        notification_type,
        title,
        body,
        link_url
      ) VALUES (
        v_comment.user_id,
        v_user_id,
        'COMMENT_LIKED',
        'Comment Liked',
        COALESCE(v_actor_profile.display_name, v_actor_profile.username, 'A maker') || ' liked your comment',
        '/community'
      );
    END IF;

    RETURN jsonb_build_object('liked', true, 'likes_count', v_new_count);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Security Guards on Comments Against Tampering & Invalid Parent Relationships
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_post_comments_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If parent_comment_id is provided, verify it belongs to the same post
  IF NEW.parent_comment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.post_comments
      WHERE id = NEW.parent_comment_id AND post_id = NEW.post_id
    ) THEN
      RAISE EXCEPTION 'Parent comment does not belong to this post';
    END IF;
  END IF;

  -- On UPDATE: lock likes_count and parent_comment_id from client direct updates
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(current_setting('workbench.internal_rpc', true), 'false') <> 'true' THEN
      NEW.likes_count := OLD.likes_count;
      NEW.parent_comment_id := OLD.parent_comment_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_post_comments ON public.post_comments;
CREATE TRIGGER trg_guard_post_comments
BEFORE INSERT OR UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.guard_post_comments_write();

CREATE OR REPLACE FUNCTION public.guard_task_comments_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If parent_comment_id is provided, verify it belongs to the same task
  IF NEW.parent_comment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.task_comments
      WHERE id = NEW.parent_comment_id AND task_id = NEW.task_id
    ) THEN
      RAISE EXCEPTION 'Parent comment does not belong to this task';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_task_comments ON public.task_comments;
CREATE TRIGGER trg_guard_task_comments
BEFORE INSERT OR UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.guard_task_comments_write();

-- ----------------------------------------------------------------------------
-- 6. Enhanced In-App Notification Trigger for Threaded Comment Replies
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_post_commented()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post RECORD;
  v_parent_comment RECORD;
  v_commenter RECORD;
BEGIN
  SELECT author_id INTO v_post
  FROM public.community_posts
  WHERE id = NEW.post_id;

  SELECT display_name, username INTO v_commenter
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- 1. If this is a threaded reply to another comment, notify the parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_comment
    FROM public.post_comments
    WHERE id = NEW.parent_comment_id;

    IF FOUND AND v_parent_comment.user_id IS NOT NULL AND v_parent_comment.user_id <> NEW.user_id THEN
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        notification_type,
        title,
        body,
        link_url
      ) VALUES (
        v_parent_comment.user_id,
        NEW.user_id,
        'COMMENT_REPLIED',
        (COALESCE(v_commenter.display_name, v_commenter.username, 'A maker')) || ' replied to your comment',
        LEFT(NEW.content, 120),
        '/community'
      );
    END IF;
  END IF;

  -- 2. Notify post author if they are not the commenter and not the parent comment author
  IF v_post.author_id IS NOT NULL
     AND v_post.author_id <> NEW.user_id
     AND (NEW.parent_comment_id IS NULL OR v_parent_comment.user_id IS DISTINCT FROM v_post.author_id) THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      title,
      body,
      link_url
    )
    VALUES (
      v_post.author_id,
      NEW.user_id,
      'POST_COMMENTED',
      (COALESCE(v_commenter.display_name, v_commenter.username, 'A maker')) || ' commented on your post',
      LEFT(NEW.content, 120),
      '/community'
    );
  END IF;

  RETURN NEW;
END;
$$;
