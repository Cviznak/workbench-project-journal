-- Migration 021: In-App User Feedback & Bug Reports
-- Version: 2.4.0
-- Rules: 100% pure LF, never mention the forbidden word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Create public.user_feedback Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'FEEDBACK' CHECK (category IN ('BUG', 'FEATURE_IDEA', 'FEEDBACK')),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 5 AND 3000),
  page_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_status_created 
  ON public.user_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id 
  ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category 
  ON public.user_feedback(category);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- A. INSERT: Any authenticated user can submit feedback where user_id matches auth.uid()
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.user_feedback;
CREATE POLICY "Authenticated users can submit feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- B. SELECT: Strictly restricted to ADMIN and ROOT_ADMIN
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.user_feedback;
CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('ADMIN', 'ROOT_ADMIN')
    )
  );

-- C. UPDATE: Strictly restricted to ADMIN and ROOT_ADMIN (e.g. updating status)
DROP POLICY IF EXISTS "Admins can update feedback status" ON public.user_feedback;
CREATE POLICY "Admins can update feedback status"
  ON public.user_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('ADMIN', 'ROOT_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('ADMIN', 'ROOT_ADMIN')
    )
  );

-- D. DELETE: Strictly restricted to ADMIN and ROOT_ADMIN
DROP POLICY IF EXISTS "Admins can delete feedback" ON public.user_feedback;
CREATE POLICY "Admins can delete feedback"
  ON public.user_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('ADMIN', 'ROOT_ADMIN')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Automatic Admin Notification Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_feedback()
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
    'USER_FEEDBACK',
    'New ' || CASE 
      WHEN NEW.category = 'BUG' THEN 'Bug Report'
      WHEN NEW.category = 'FEATURE_IDEA' THEN 'Feature Idea'
      ELSE 'User Feedback'
    END,
    SUBSTRING(NEW.message FROM 1 FOR 120),
    '/admin'
  FROM public.profiles p
  WHERE p.role IN ('ROOT_ADMIN', 'ADMIN')
    AND p.is_suspended = false;

  RETURN NEW;
END;
$$;

-- Revoke direct execution from public and anon
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_new_feedback() FROM public, anon;

DROP TRIGGER IF EXISTS trg_notify_admins_on_new_feedback ON public.user_feedback;
CREATE TRIGGER trg_notify_admins_on_new_feedback
  AFTER INSERT ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_feedback();
