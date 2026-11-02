-- Migration 003: Skill requests and approval workflow

CREATE TABLE IF NOT EXISTS public.skill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_requests_user_id ON public.skill_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_requests_status ON public.skill_requests(status);

ALTER TABLE public.skill_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests; Admins can see all requests
DROP POLICY IF EXISTS "Users can see own or admin view all skill requests" ON public.skill_requests;
CREATE POLICY "Users can see own or admin view all skill requests"
  ON public.skill_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR public.is_admin()
  );

-- Authenticated users can insert requests for themselves
DROP POLICY IF EXISTS "Users can insert own skill requests" ON public.skill_requests;
CREATE POLICY "Users can insert own skill requests"
  ON public.skill_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Only admins can update skill requests directly or via RPC
DROP POLICY IF EXISTS "Admins can update skill requests" ON public.skill_requests;
CREATE POLICY "Admins can update skill requests"
  ON public.skill_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());
