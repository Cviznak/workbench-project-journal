-- Migration 017: Unified In-App Notifications Engine & Admin Email Alerts
-- Version: 2.0.0
-- Rules: 100% pure LF, never mention the J-word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Notifications Table (public.notifications)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  link_url TEXT DEFAULT '/dashboard',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
  ON public.notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
  ON public.notifications(recipient_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Strict recipient-only access policies
DROP POLICY IF EXISTS "Notifications strictly private to recipient" ON public.notifications;
CREATE POLICY "Notifications strictly private to recipient"
  ON public.notifications FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = recipient_id)
  WITH CHECK ((SELECT auth.uid()) = recipient_id);

-- Enable Realtime publication for instant UI notification badge updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Automatic Notification Triggers
-- ----------------------------------------------------------------------------

-- A. Notify all active Administrators when a new Skill Request is submitted
CREATE OR REPLACE FUNCTION public.notify_skill_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    title,
    body,
    link_url
  )
  SELECT
    p.id,
    NEW.user_id,
    'SKILL_REQUEST_ADMIN',
    'New Skill Request: ' || NEW.name,
    'Category: ' || NEW.category || COALESCE(' — ' || NULLIF(NEW.reason, ''), ''),
    '/admin'
  FROM public.profiles p
  WHERE p.role IN ('ROOT_ADMIN', 'ADMIN')
    AND p.is_suspended = false
    AND COALESCE((p.settings_json->>'in_app_skill_requests')::boolean, true) = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_skill_request_created ON public.skill_requests;
CREATE TRIGGER trg_notify_skill_request_created
AFTER INSERT ON public.skill_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_skill_request_created();

-- B. Notify the requesting Maker when their Skill Request is Approved or Declined
CREATE OR REPLACE FUNCTION public.notify_skill_request_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'PENDING' AND NEW.status IN ('APPROVED', 'REJECTED') THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      title,
      body,
      link_url
    )
    VALUES (
      NEW.user_id,
      NULL,
      'SKILL_REQUEST_REVIEWED',
      CASE 
        WHEN NEW.status = 'APPROVED' THEN 'Skill Request Approved: ' || NEW.name
        ELSE 'Skill Request Declined: ' || NEW.name
      END,
      CASE 
        WHEN NEW.status = 'APPROVED' THEN 'Your requested skill "' || NEW.name || '" was approved and added to your profile (+25 XP)!'
        ELSE 'Your request for "' || NEW.name || '" was declined by an administrator.'
      END,
      '/skills'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_skill_request_reviewed ON public.skill_requests;
CREATE TRIGGER trg_notify_skill_request_reviewed
AFTER UPDATE OF status ON public.skill_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_skill_request_reviewed();

-- C. Notify Community Post Author when someone comments on their post
CREATE OR REPLACE FUNCTION public.notify_post_commented()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post RECORD;
  v_commenter RECORD;
BEGIN
  SELECT author_id INTO v_post
  FROM public.community_posts
  WHERE id = NEW.post_id;

  IF FOUND AND v_post.author_id IS NOT NULL AND v_post.author_id <> NEW.user_id THEN
    SELECT display_name, username INTO v_commenter
    FROM public.profiles
    WHERE id = NEW.user_id;

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

DROP TRIGGER IF EXISTS trg_notify_post_commented ON public.post_comments;
CREATE TRIGGER trg_notify_post_commented
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_commented();

-- D. Notify Community Post Author when someone likes their post
CREATE OR REPLACE FUNCTION public.notify_post_liked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post RECORD;
  v_liker RECORD;
  v_already_notified BOOLEAN;
BEGIN
  SELECT author_id INTO v_post
  FROM public.community_posts
  WHERE id = NEW.post_id;

  IF FOUND AND v_post.author_id IS NOT NULL AND v_post.author_id <> NEW.user_id THEN
    -- Prevent duplicate unread notifications from same user within 24h
    SELECT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE recipient_id = v_post.author_id
        AND actor_id = NEW.user_id
        AND notification_type = 'POST_LIKED'
        AND is_read = false
        AND created_at > (now() - interval '24 hours')
    ) INTO v_already_notified;

    IF NOT v_already_notified THEN
      SELECT display_name, username INTO v_liker
      FROM public.profiles
      WHERE id = NEW.user_id;

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
        'POST_LIKED',
        (COALESCE(v_liker.display_name, v_liker.username, 'A maker')) || ' liked your post',
        'Your post received a new like on the Community Feed.',
        '/community'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_liked ON public.post_likes;
CREATE TRIGGER trg_notify_post_liked
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_liked();

-- E. Notify Assignee when assigned to a Project Task
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj RECORD;
  v_actor_id UUID := auth.uid();
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    -- Only notify if assigned by someone else
    IF v_actor_id IS NULL OR NEW.assignee_id <> v_actor_id THEN
      SELECT name INTO v_proj FROM public.projects WHERE id = NEW.project_id;

      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        notification_type,
        title,
        body,
        link_url
      )
      VALUES (
        NEW.assignee_id,
        v_actor_id,
        'TASK_ASSIGNED',
        'New Task Assigned: ' || NEW.title,
        'Assigned in project "' || COALESCE(v_proj.name, 'Workbench Project') || '"',
        '/projects/' || NEW.project_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.project_tasks;
CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT OR UPDATE OF assignee_id ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assigned();

-- ----------------------------------------------------------------------------
-- 3. Secure RPCs for Email Dispatch & Notification Management
-- ----------------------------------------------------------------------------

-- A. Fetch Admin Emails for Skill Request Email Alerts
CREATE OR REPLACE FUNCTION public.get_admin_emails_for_skill_request(p_request_id UUID)
RETURNS TABLE (
  admin_email TEXT,
  admin_name TEXT,
  skill_name TEXT,
  skill_category TEXT,
  skill_reason TEXT,
  requester_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_req RECORD;
  v_requester RECORD;
  v_is_authorized BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_req
  FROM public.skill_requests
  WHERE id = p_request_id;

  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Skill request not found';
  END IF;

  -- Caller must be the original requester or an administrator
  v_is_authorized := (v_req.user_id = v_caller_id) OR public.is_admin();
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Forbidden: Not authorized to fetch admin recipients for this request';
  END IF;

  SELECT username INTO v_requester
  FROM public.profiles
  WHERE id = v_req.user_id;

  RETURN QUERY
  SELECT
    u.email::TEXT AS admin_email,
    COALESCE(p.display_name, p.username, 'Administrator')::TEXT AS admin_name,
    v_req.name::TEXT AS skill_name,
    v_req.category::TEXT AS skill_category,
    COALESCE(v_req.reason, '')::TEXT AS skill_reason,
    COALESCE(v_requester.username, 'maker')::TEXT AS requester_username
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role IN ('ROOT_ADMIN', 'ADMIN')
    AND p.is_suspended = false
    -- Honor email opt-out preference from settings_json
    AND COALESCE((p.settings_json->>'email_skill_requests')::boolean, true) = true;
END;
$$;

-- B. Mark All Notifications as Read for the Calling User
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.notifications
  SET is_read = true
  WHERE recipient_id = v_caller_id
    AND is_read = false;
END;
$$;
