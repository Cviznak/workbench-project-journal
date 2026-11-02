-- ============================================================================
-- Supabase Migration: 001_init_schema_and_rls.sql
-- Production-Ready Gamified Productivity & Project Management Architecture
-- Includes: Profiles, Genesis Admin, Immutability Guards, Skills Catalog,
--           XP Engine, Private Workspace, Jira-Style Projects, and RLS.
-- ============================================================================

-- 1. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SCHEMAS & CUSTOM TYPES
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('ROOT_ADMIN', 'ADMIN', 'USER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workspace_item_type AS ENUM ('IDEA', 'NOTE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.idea_status AS ENUM ('RAW', 'PROTOTYPING', 'PROMOTED', 'SHELVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. CORE TABLES DEFINITIONS
-- ============================================================================

-- A. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'USER',
  is_immutable BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B. GLOBAL SKILL CATALOG
CREATE TABLE IF NOT EXISTS public.skill_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C. USER SKILLS (XP & Level Engine)
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id)
);

-- D. PRACTICE LOGS
CREATE TABLE IF NOT EXISTS public.practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL CHECK (duration_minutes >= 0),
  xp_gained INT NOT NULL CHECK (xp_gained >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- E. WORKSPACE ITEMS (Private Ideas & Markdown Notes)
CREATE TABLE IF NOT EXISTS public.workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type public.workspace_item_type NOT NULL DEFAULT 'NOTE',
  title TEXT NOT NULL,
  content_md TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  idea_status public.idea_status NOT NULL DEFAULT 'RAW',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F. PROJECTS (Collaborative Jira-Style Workspaces)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pm_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.project_status NOT NULL DEFAULT 'PLANNING',
  completion_xp_reward INT NOT NULL DEFAULT 100 CHECK (completion_xp_reward >= 0),
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- G. PROJECT MEMBERS
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- H. PROJECT SKILLS (Skills developed by this project)
CREATE TABLE IF NOT EXISTS public.project_skills (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, skill_id)
);

-- I. PROJECT TASKS
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  skill_id UUID REFERENCES public.skill_catalog(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status public.task_status NOT NULL DEFAULT 'TODO',
  priority public.task_priority NOT NULL DEFAULT 'MEDIUM',
  xp_reward INT NOT NULL DEFAULT 25 CHECK (xp_reward >= 0),
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- J. ACTIVITY LOGS (Auditable history ledger)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  xp_delta INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_skill_catalog_slug ON public.skill_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON public.user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_practice_logs_user ON public.practice_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_logs_skill ON public.practice_logs(skill_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_user ON public.workspace_items(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_status ON public.workspace_items(idea_status);
CREATE INDEX IF NOT EXISTS idx_projects_pm ON public.projects(pm_user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_skills_project ON public.project_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee ON public.project_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_skill ON public.project_tasks(skill_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON public.activity_logs(project_id);

-- ============================================================================
-- 5. DETERMINISTIC LEVEL FORMULA
-- Formula: level = floor(0.1 * sqrt(total_xp)) + 1
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_skill_level(p_xp INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (floor(0.1 * sqrt(GREATEST(0, p_xp)))::INT + 1);
$$;

-- ============================================================================
-- 6. SECURITY DEFINER ACCESS CONTROL & MEMBERSHIP HELPERS
-- ============================================================================

-- Check if current authenticated user is project member or project manager
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND pm_user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = v_user_id
  );
END;
$$;

-- Check if current authenticated user is an active administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  );
END;
$$;

-- ============================================================================
-- 7. GENESIS TRIGGER & IMMUTABILITY GUARDS
-- ============================================================================

-- Genesis Trigger: The very first user to sign up becomes the immutable ROOT_ADMIN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_count INT;
  v_raw_username TEXT;
  v_username TEXT;
  v_display_name TEXT;
  v_role public.user_role;
  v_is_immutable BOOLEAN;
BEGIN
  SELECT count(*) INTO v_profile_count FROM public.profiles;

  IF v_profile_count = 0 THEN
    v_role := 'ROOT_ADMIN';
    v_is_immutable := true;
  ELSE
    v_role := 'USER';
    v_is_immutable := false;
  END IF;

  -- Extract or derive unique username
  v_raw_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  v_raw_username := lower(regexp_replace(v_raw_username, '[^a-zA-Z0-9_]', '', 'g'));
  IF length(v_raw_username) < 3 THEN
    v_raw_username := 'user_' || substr(NEW.id::text, 1, 6);
  END IF;

  v_username := v_raw_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(NEW.id::text, 1, 4);
  END IF;

  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    v_username
  );

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    role,
    is_immutable,
    is_suspended,
    settings_json,
    created_at
  ) VALUES (
    NEW.id,
    v_username,
    v_display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    v_role,
    v_is_immutable,
    false,
    '{}'::jsonb,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Immutability Guard: Never allow deleting, demoting, or suspending the Root Admin
CREATE OR REPLACE FUNCTION public.protect_root_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_immutable = true THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot modify or demote the immutable Root Admin';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF (NEW.role != OLD.role) OR
         (NEW.is_immutable != OLD.is_immutable) OR
         (NEW.is_suspended != OLD.is_suspended) THEN
        RAISE EXCEPTION 'Cannot modify or demote the immutable Root Admin';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_root_admin ON public.profiles;
CREATE TRIGGER trg_protect_root_admin
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_root_admin();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Zero-Trust on all tables
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- A. PROFILES
CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update non-critical profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    is_immutable = (SELECT is_immutable FROM public.profiles WHERE id = auth.uid()) AND
    is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid())
  );

-- B. SKILL CATALOG
CREATE POLICY "Skill catalog readable by authenticated users"
  ON public.skill_catalog FOR SELECT
  TO authenticated
  USING (true);

-- C. USER SKILLS
-- Direct user inserts/updates are blocked. Only readable by authenticated users
CREATE POLICY "User skills readable by authenticated users"
  ON public.user_skills FOR SELECT
  TO authenticated
  USING (true);

-- D. PRACTICE LOGS
CREATE POLICY "Practice logs viewable only by owner"
  ON public.practice_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- E. WORKSPACE ITEMS (Private Ideas & Notes)
CREATE POLICY "Workspace items strictly isolated to owner"
  ON public.workspace_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- F. PROJECTS
CREATE POLICY "Projects viewable by members or admins"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_project_member(id) OR public.is_admin());

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = pm_user_id);

CREATE POLICY "Project PM can update project"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = pm_user_id)
  WITH CHECK (auth.uid() = pm_user_id);

CREATE POLICY "Project PM can delete project"
  ON public.projects FOR DELETE
  TO authenticated
  USING (auth.uid() = pm_user_id);

-- G. PROJECT MEMBERS
CREATE POLICY "Project members viewable by project members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id) OR public.is_admin());

CREATE POLICY "Project PM can add members"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND pm_user_id = auth.uid())
  );

CREATE POLICY "Project PM can remove members"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND pm_user_id = auth.uid()) OR
    auth.uid() = user_id
  );

-- H. PROJECT SKILLS
CREATE POLICY "Project skills viewable by project members"
  ON public.project_skills FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id) OR public.is_admin());

CREATE POLICY "Project PM can manage project skills"
  ON public.project_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND pm_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND pm_user_id = auth.uid())
  );

-- I. PROJECT TASKS
CREATE POLICY "Tasks viewable by project members"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id) OR public.is_admin());

CREATE POLICY "Tasks creatable by project members"
  ON public.project_tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Tasks updatable by project members"
  ON public.project_tasks FOR UPDATE
  TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (
    public.is_project_member(project_id) AND
    -- Direct updates cannot tamper with xp_awarded flag
    xp_awarded = (SELECT xp_awarded FROM public.project_tasks WHERE id = project_tasks.id)
  );

CREATE POLICY "Tasks deletable by project members"
  ON public.project_tasks FOR DELETE
  TO authenticated
  USING (public.is_project_member(project_id));

-- J. ACTIVITY LOGS
CREATE POLICY "Activity logs viewable by actor or project peers"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (project_id IS NOT NULL AND public.is_project_member(project_id)) OR
    public.is_admin()
  );

-- ============================================================================
-- 9. SECURITY DEFINER RPC FUNCTIONS (Zero Client Trust)
-- All XP, Level Ups, Task Completions, and Admin actions run securely on the server
-- ============================================================================

-- 1. LOG SKILL PRACTICE
CREATE OR REPLACE FUNCTION public.log_skill_practice(
  p_skill_name TEXT,
  p_duration_minutes INT,
  p_xp INT,
  p_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT := trim(p_skill_name);
  v_slug TEXT := lower(v_clean_name);
  v_skill_id UUID;
  v_new_xp INT;
  v_new_level INT;
  v_old_level INT := 1;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_suspended = true) THEN
    RAISE EXCEPTION 'Forbidden: User account is suspended';
  END IF;

  IF length(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Skill name must be at least 2 characters';
  END IF;

  IF p_xp < 0 OR p_xp > 1000 THEN
    RAISE EXCEPTION 'Invalid XP amount: must be between 0 and 1000';
  END IF;

  -- 1. Find or create in global catalog
  SELECT id INTO v_skill_id FROM public.skill_catalog WHERE slug = v_slug;
  IF v_skill_id IS NULL THEN
    INSERT INTO public.skill_catalog (slug, name, category)
    VALUES (v_slug, v_clean_name, 'Craft & Fabrication')
    RETURNING id INTO v_skill_id;
  END IF;

  -- 2. Get current level
  SELECT level INTO v_old_level FROM public.user_skills
  WHERE user_id = v_user_id AND skill_id = v_skill_id;

  -- 3. Upsert user skills with atomic level calculation
  INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
  VALUES (v_user_id, v_skill_id, p_xp, public.calculate_skill_level(p_xp), now())
  ON CONFLICT (user_id, skill_id) DO UPDATE SET
    total_xp = user_skills.total_xp + p_xp,
    level = public.calculate_skill_level(user_skills.total_xp + p_xp),
    last_practiced_at = now()
  RETURNING total_xp, level INTO v_new_xp, v_new_level;

  -- 4. Insert practice log
  INSERT INTO public.practice_logs (user_id, skill_id, duration_minutes, xp_gained, note)
  VALUES (v_user_id, v_skill_id, p_duration_minutes, p_xp, COALESCE(p_note, ''));

  -- 5. Record activity log
  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_user_id,
    'PRACTICE_LOG',
    'Practiced ' || v_clean_name || ' for ' || p_duration_minutes || ' mins (+' || p_xp || ' XP)',
    p_xp,
    jsonb_build_object(
      'skill_id', v_skill_id,
      'skill_name', v_clean_name,
      'old_level', COALESCE(v_old_level, 1),
      'new_level', v_new_level,
      'level_up', (v_new_level > COALESCE(v_old_level, 1))
    )
  );

  RETURN jsonb_build_object(
    'skill_id', v_skill_id,
    'skill_name', v_clean_name,
    'total_xp', v_new_xp,
    'level', v_new_level,
    'xp_gained', p_xp,
    'level_up', (v_new_level > COALESCE(v_old_level, 1))
  );
END;
$$;

-- 2. COMPLETE PROJECT TASK (Payout 1: Individual Task Completion XP)
CREATE OR REPLACE FUNCTION public.complete_project_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_task RECORD;
  v_skill_ids UUID[] := '{}';
  v_sid UUID;
  v_skill_name TEXT;
  v_xp_per_skill INT;
  v_new_xp INT;
  v_new_level INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock the task row to prevent race conditions
  SELECT * INTO v_task
  FROM public.project_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF NOT public.is_project_member(v_task.project_id) THEN
    RAISE EXCEPTION 'Forbidden: You are not a member of this project';
  END IF;

  -- Set status to DONE
  UPDATE public.project_tasks
  SET status = 'DONE', updated_at = now()
  WHERE id = p_task_id;

  -- Award XP only if not awarded yet and task has an assignee
  IF v_task.xp_awarded = false AND v_task.assignee_id IS NOT NULL THEN
    UPDATE public.project_tasks
    SET xp_awarded = true
    WHERE id = p_task_id;

    -- Determine skill(s) to grant XP to
    IF v_task.skill_id IS NOT NULL THEN
      v_skill_ids := ARRAY[v_task.skill_id];
      v_xp_per_skill := v_task.xp_reward;
    ELSE
      -- Fallback: grant to all skills linked to this project
      SELECT array_agg(skill_id) INTO v_skill_ids
      FROM public.project_skills
      WHERE project_id = v_task.project_id;

      IF v_skill_ids IS NULL OR array_length(v_skill_ids, 1) = 0 THEN
        v_skill_ids := '{}';
      END IF;
      v_xp_per_skill := v_task.xp_reward;
    END IF;

    -- Award XP to the assignee for each skill (Auto-Unlock if not owned)
    FOREACH v_sid IN ARRAY v_skill_ids LOOP
      SELECT name INTO v_skill_name FROM public.skill_catalog WHERE id = v_sid;

      INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
      VALUES (v_task.assignee_id, v_sid, v_xp_per_skill, public.calculate_skill_level(v_xp_per_skill), now())
      ON CONFLICT (user_id, skill_id) DO UPDATE SET
        total_xp = user_skills.total_xp + v_xp_per_skill,
        level = public.calculate_skill_level(user_skills.total_xp + v_xp_per_skill),
        last_practiced_at = now()
      RETURNING total_xp, level INTO v_new_xp, v_new_level;

      INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
      VALUES (
        v_task.assignee_id,
        v_task.project_id,
        'TASK_COMPLETED',
        'Completed task “' || v_task.title || '” (+' || v_xp_per_skill || ' XP in ' || COALESCE(v_skill_name, 'Skill') || ')',
        v_xp_per_skill,
        jsonb_build_object('task_id', v_task.id, 'skill_id', v_sid, 'level', v_new_level)
      );
    END LOOP;

    RETURN jsonb_build_object(
      'task_id', v_task.id,
      'status', 'DONE',
      'xp_awarded', true,
      'assignee_id', v_task.assignee_id,
      'xp_gained', v_task.xp_reward
    );
  END IF;

  RETURN jsonb_build_object(
    'task_id', v_task.id,
    'status', 'DONE',
    'xp_awarded', false
  );
END;
$$;

-- 3. COMPLETE PROJECT (Payout 2: Team-Wide Project Completion XP)
CREATE OR REPLACE FUNCTION public.complete_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
  v_member RECORD;
  v_skill RECORD;
  v_xp_reward INT;
  v_members_awarded INT := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock project row
  SELECT * INTO v_proj
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_proj.pm_user_id != v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only the Project Manager can mark the project completed';
  END IF;

  v_xp_reward := v_proj.completion_xp_reward;

  -- Update status
  UPDATE public.projects
  SET status = 'COMPLETED'
  WHERE id = p_project_id;

  -- If XP not awarded yet, distribute team-wide payout
  IF v_proj.xp_awarded = false THEN
    UPDATE public.projects
    SET xp_awarded = true
    WHERE id = p_project_id;

    -- Ensure PM is included in members
    INSERT INTO public.project_members (project_id, user_id)
    VALUES (p_project_id, v_proj.pm_user_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Loop through all members
    FOR v_member IN (
      SELECT DISTINCT user_id FROM public.project_members WHERE project_id = p_project_id
    ) LOOP
      v_members_awarded := v_members_awarded + 1;

      -- Loop through all skills linked to this project
      FOR v_skill IN (
        SELECT s.id, s.name
        FROM public.project_skills ps
        JOIN public.skill_catalog s ON s.id = ps.skill_id
        WHERE ps.project_id = p_project_id
      ) LOOP
        -- Auto-unlock skill for member if needed and grant XP
        INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
        VALUES (v_member.user_id, v_skill.id, v_xp_reward, public.calculate_skill_level(v_xp_reward), now())
        ON CONFLICT (user_id, skill_id) DO UPDATE SET
          total_xp = user_skills.total_xp + v_xp_reward,
          level = public.calculate_skill_level(user_skills.total_xp + v_xp_reward),
          last_practiced_at = now();

        -- Log activity
        INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
        VALUES (
          v_member.user_id,
          p_project_id,
          'PROJECT_COMPLETED',
          'Completed Project “' || v_proj.name || '” (+' || v_xp_reward || ' XP in ' || v_skill.name || ')',
          v_xp_reward,
          jsonb_build_object('project_id', p_project_id, 'skill_id', v_skill.id)
        );
      END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
      'project_id', p_project_id,
      'status', 'COMPLETED',
      'xp_awarded', true,
      'members_count', v_members_awarded,
      'xp_per_skill', v_xp_reward
    );
  END IF;

  RETURN jsonb_build_object(
    'project_id', p_project_id,
    'status', 'COMPLETED',
    'xp_awarded', false
  );
END;
$$;

-- 4. TRANSFER PROJECT MANAGER (PM)
CREATE OR REPLACE FUNCTION public.transfer_project_pm(
  p_project_id UUID,
  p_new_pm_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
  v_new_pm_name TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = p_project_id;
  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_proj.pm_user_id != v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only current PM or admin can transfer leadership';
  END IF;

  -- Ensure new PM is a member of the project
  IF NOT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_new_pm_user_id
  ) THEN
    INSERT INTO public.project_members (project_id, user_id)
    VALUES (p_project_id, p_new_pm_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT display_name INTO v_new_pm_name FROM public.profiles WHERE id = p_new_pm_user_id;

  UPDATE public.projects
  SET pm_user_id = p_new_pm_user_id
  WHERE id = p_project_id;

  INSERT INTO public.activity_logs (user_id, project_id, event_type, summary)
  VALUES (
    v_caller_id,
    p_project_id,
    'PM_TRANSFERRED',
    'Transferred Project Manager role of “' || v_proj.name || '” to ' || COALESCE(v_new_pm_name, 'member')
  );

  RETURN jsonb_build_object('success', true, 'new_pm_user_id', p_new_pm_user_id);
END;
$$;

-- 5. ADMIN HUB: PROMOTE TO ADMIN
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

-- 6. ADMIN HUB: DEMOTE TO USER
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

-- 7. ADMIN HUB: TOGGLE USER SUSPENSION
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

-- 8. INITIAL SEED: Popular Maker Skills in Catalog
INSERT INTO public.skill_catalog (slug, name, category)
VALUES
  ('3d-printing', '3D Printing & Slicing', 'Fabrication'),
  ('woodworking', 'Woodworking & Joinery', 'Fabrication'),
  ('electronics', 'Electronics & Soldering', 'Hardware'),
  ('programming', 'Firmware & Coding', 'Software'),
  ('cad-design', '3D CAD Modeling', 'Design'),
  ('finishing', 'Sanding & Finishing', 'Finishing'),
  ('leathercraft', 'Leathercraft & Sewing', 'Textiles')
ON CONFLICT (slug) DO NOTHING;
