-- Migration 015: Maker Community Social Feed, Public Maker Profiles, Public Project Showcase, and Searchable Skills
-- Version: 1.9.0
-- Rules: 100% pure LF line endings, never mention the J-word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. Profiles & Projects Extensions (Bio & Public Showcase Toggle)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '' CHECK (char_length(bio) <= 500);

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Performance index for public project filtering
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON public.projects(is_public) WHERE is_public = true;

-- Update SELECT policy on public.projects to allow viewing public projects
DROP POLICY IF EXISTS "Projects viewable by members only" ON public.projects;
DROP POLICY IF EXISTS "Projects viewable by members or public" ON public.projects;

CREATE POLICY "Projects viewable by members or public"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    pm_user_id = (SELECT auth.uid()) OR
    public.is_project_member(id) OR
    is_public = true
  );

-- Update SELECT policy on public.project_skills
DROP POLICY IF EXISTS "Project skills viewable by project members" ON public.project_skills;
DROP POLICY IF EXISTS "Project skills viewable by project members or public" ON public.project_skills;

CREATE POLICY "Project skills viewable by project members or public"
  ON public.project_skills FOR SELECT
  TO authenticated
  USING (
    public.is_project_member(project_id) OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_skills.project_id AND p.is_public = true
    )
  );

-- Update SELECT policy on public.project_members
DROP POLICY IF EXISTS "Project members viewable by project members" ON public.project_members;
DROP POLICY IF EXISTS "Project members viewable by project members or public" ON public.project_members;

CREATE POLICY "Project members viewable by project members or public"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    public.is_project_member(project_id) OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id AND p.is_public = true
    )
  );

-- Update SELECT policy on public.project_tasks
DROP POLICY IF EXISTS "Tasks viewable by project members" ON public.project_tasks;
DROP POLICY IF EXISTS "Tasks viewable by project members or public" ON public.project_tasks;

CREATE POLICY "Tasks viewable by project members or public"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (
    public.is_project_member(project_id) OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_tasks.project_id AND p.is_public = true
    )
  );

-- Update SELECT policy on public.user_skills (Public profile showcase)
DROP POLICY IF EXISTS "User skills readable by authenticated users" ON public.user_skills;
CREATE POLICY "User skills readable by authenticated users"
  ON public.user_skills FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 2. Community Posts Table (public.community_posts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  content_md TEXT NOT NULL CHECK (char_length(trim(content_md)) BETWEEN 1 AND 5000),
  image_url TEXT,
  skill_id UUID REFERENCES public.skill_catalog(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  likes_count INT NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INT NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_project ON public.community_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_skill ON public.community_posts(skill_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community posts viewable by all authenticated users"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Community posts creatable by authenticated author"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Community posts updatable by author"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Community posts deletable by author or admin"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = author_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Post Likes (public.post_likes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post likes viewable by all authenticated users"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Post likes insertable by self"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Post likes deletable by self"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 4. Post Comments (public.post_comments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON public.post_comments(user_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post comments viewable by all authenticated users"
  ON public.post_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Post comments insertable by authenticated user"
  ON public.post_comments FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Post comments deletable by comment author, post author, or admin"
  ON public.post_comments FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id OR
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_comments.post_id AND cp.author_id = (SELECT auth.uid())
    ) OR
    public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 5. Auto-sync Counters Triggers (Likes and Comments)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_post_like_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_post_likes_counter ON public.post_likes;
CREATE TRIGGER trg_post_likes_counter
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.handle_post_like_counter();

CREATE OR REPLACE FUNCTION public.handle_post_comment_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_post_comments_counter ON public.post_comments;
CREATE TRIGGER trg_post_comments_counter
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_post_comment_counter();

-- ----------------------------------------------------------------------------
-- 6. RPC: toggle_post_like
-- ----------------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION public.toggle_post_like(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. Storage Bucket for Post Images ('community-media')
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media',
  'community-media',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Storage RLS policies for community-media
DROP POLICY IF EXISTS "Community media viewable by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Community media uploadable by author in user folder" ON storage.objects;
DROP POLICY IF EXISTS "Community media deletable by author in user folder" ON storage.objects;

CREATE POLICY "Community media viewable by authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'community-media');

CREATE POLICY "Community media uploadable by author in user folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-media' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Community media deletable by author in user folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-media' AND
    (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- 8. Add Tables to Realtime Publication
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_posts'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_comments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
    END IF;
  END IF;
END $$;
