-- Migration 016: Security Guards & Avatar Hardening
-- Version: 1.9.1
-- Rules: 100% pure LF, never mention the J-word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Guard public.profiles Against Client-Side Tampering & Check Avatar URL
-- ----------------------------------------------------------------------------

-- Add constraint on avatar_url format
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS chk_profiles_avatar_url;

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_avatar_url
CHECK (avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE 'https://%');

-- Create trigger function to enforce that client cannot spoof role, streak, or security flags
CREATE OR REPLACE FUNCTION public.guard_profile_client_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If not invoked by internal SECURITY DEFINER RPC, protect sensitive system fields
  IF COALESCE(current_setting('workbench.internal_rpc', true), 'false') <> 'true' THEN
    NEW.role := OLD.role;
    NEW.is_immutable := OLD.is_immutable;
    NEW.is_suspended := OLD.is_suspended;
    NEW.current_streak := OLD.current_streak;
    NEW.longest_streak := OLD.longest_streak;
    NEW.last_active_date := OLD.last_active_date;
  END IF;

  -- Validate avatar_url format if provided
  IF NEW.avatar_url IS NOT NULL AND trim(NEW.avatar_url) <> '' THEN
    IF NOT (NEW.avatar_url LIKE 'https://%') THEN
      RAISE EXCEPTION 'Avatar URL must be a valid https link';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_client_updates ON public.profiles;
CREATE TRIGGER trg_guard_profile_client_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_client_updates();

-- Replace legacy update policy with clean authenticated owner check (trigger enforces field security)
DROP POLICY IF EXISTS "Users can update non-critical profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. Update Admin & Streak RPCs to Set Internal Session Flag
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_to_admin(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target RECORD;
BEGIN
  PERFORM set_config('workbench.internal_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_target.role = 'ROOT_ADMIN' OR v_target.is_immutable THEN
    RAISE EXCEPTION 'Cannot modify Root Admin';
  END IF;

  UPDATE public.profiles
  SET role = 'ADMIN'
  WHERE id = p_target_user_id;

  INSERT INTO public.activity_logs (user_id, event_type, summary)
  VALUES (
    v_caller_id,
    'ROLE_PROMOTED',
    'Promoted @' || v_target.username || ' to ADMIN'
  );

  RETURN jsonb_build_object('success', true, 'role', 'ADMIN');
END;
$$;

CREATE OR REPLACE FUNCTION public.demote_to_user(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target RECORD;
BEGIN
  PERFORM set_config('workbench.internal_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_target.is_immutable OR v_target.role = 'ROOT_ADMIN' THEN
    RAISE EXCEPTION 'Cannot modify or demote the immutable Root Admin';
  END IF;

  UPDATE public.profiles
  SET role = 'USER'
  WHERE id = p_target_user_id;

  INSERT INTO public.activity_logs (user_id, event_type, summary)
  VALUES (
    v_caller_id,
    'ROLE_DEMOTED',
    'Demoted @' || v_target.username || ' to USER'
  );

  RETURN jsonb_build_object('success', true, 'role', 'USER');
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_user_suspension(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target RECORD;
  v_new_status BOOLEAN;
BEGIN
  PERFORM set_config('workbench.internal_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_target.is_immutable OR v_target.role = 'ROOT_ADMIN' THEN
    RAISE EXCEPTION 'Cannot modify or suspend the immutable Root Admin';
  END IF;

  v_new_status := NOT v_target.is_suspended;

  UPDATE public.profiles
  SET is_suspended = v_new_status
  WHERE id = p_target_user_id;

  INSERT INTO public.activity_logs (user_id, event_type, summary)
  VALUES (
    v_caller_id,
    'USER_SUSPENSION_TOGGLED',
    (CASE WHEN v_new_status THEN 'Suspended @' ELSE 'Reactivated @' END) || v_target.username
  );

  RETURN jsonb_build_object('success', true, 'is_suspended', v_new_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_user_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_active DATE;
  v_curr_streak INT;
  v_long_streak INT;
BEGIN
  PERFORM set_config('workbench.internal_rpc', 'true', true);

  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_curr_streak, v_long_streak
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If already active today, no change
  IF v_last_active = CURRENT_DATE THEN
    RETURN;
  END IF;

  -- If active yesterday, increment streak
  IF v_last_active = CURRENT_DATE - 1 THEN
    v_curr_streak := v_curr_streak + 1;
    v_long_streak := GREATEST(v_long_streak, v_curr_streak);
  ELSE
    -- Streak reset
    v_curr_streak := 1;
    v_long_streak := GREATEST(v_long_streak, 1);
  END IF;

  UPDATE public.profiles
  SET current_streak = v_curr_streak,
      longest_streak = v_long_streak,
      last_active_date = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Guard public.community_posts Against Counter Spoofing & Unauthorized Projects
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_community_posts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On UPDATE: lock likes_count and comments_count from client direct updates
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(current_setting('workbench.internal_rpc', true), 'false') <> 'true' THEN
      NEW.likes_count := OLD.likes_count;
      NEW.comments_count := OLD.comments_count;
    END IF;
  END IF;

  -- On INSERT or UPDATE: verify user is a member of the linked project if provided
  IF NEW.project_id IS NOT NULL THEN
    IF NOT public.is_project_member(NEW.project_id) THEN
      RAISE EXCEPTION 'You can only link projects you are a member of';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_community_posts ON public.community_posts;
CREATE TRIGGER trg_guard_community_posts
BEFORE INSERT OR UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.guard_community_posts();

-- Update post like/comment counter triggers & toggle_post_like RPC to set workbench.internal_rpc
CREATE OR REPLACE FUNCTION public.handle_post_like_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('workbench.internal_rpc', 'true', true);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_post_comment_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('workbench.internal_rpc', 'true', true);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_already_liked BOOLEAN;
  v_new_count INT;
BEGIN
  PERFORM set_config('workbench.internal_rpc', 'true', true);

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_caller_id
  ) INTO v_already_liked;

  IF v_already_liked THEN
    DELETE FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_caller_id;

    SELECT likes_count INTO v_new_count
    FROM public.community_posts
    WHERE id = p_post_id;

    RETURN jsonb_build_object(
      'liked', false,
      'likes_count', COALESCE(v_new_count, 0)
    );
  ELSE
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (p_post_id, v_caller_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;

    SELECT likes_count INTO v_new_count
    FROM public.community_posts
    WHERE id = p_post_id;

    RETURN jsonb_build_object(
      'liked', true,
      'likes_count', COALESCE(v_new_count, 1)
    );
  END IF;
END;
$$;
