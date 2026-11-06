-- ============================================================================
-- Migration 028: Project Budgets & Community Formula Marketplace (v3.2.0)
-- 1. Adds budget_limit and currency to public.projects
-- 2. Updates create_maker_project RPC to support budget_limit and currency
-- 3. Creates public.get_public_marketplace_feed RPC for community discovery
-- ============================================================================

-- 1. Alter public.projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget_limit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (budget_limit >= 0),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'ILS', 'GBP'));

-- 2. Update create_maker_project RPC with budget & currency support
CREATE OR REPLACE FUNCTION public.create_maker_project(
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_completion_xp_reward INT DEFAULT 100,
  p_skill_ids UUID[] DEFAULT '{}'::uuid[],
  p_member_user_ids UUID[] DEFAULT '{}'::uuid[],
  p_budget_limit NUMERIC DEFAULT 0,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_clean_name TEXT := trim(p_name);
  v_project_id UUID;
  v_skill_id UUID;
  v_member_id UUID;
  v_currency TEXT := UPPER(COALESCE(p_currency, 'USD'));
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF length(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Project name must be at least 2 characters long';
  END IF;

  IF v_currency NOT IN ('USD', 'EUR', 'ILS', 'GBP') THEN
    v_currency := 'USD';
  END IF;

  -- 1. Insert into public.projects
  INSERT INTO public.projects (
    name,
    description,
    pm_user_id,
    status,
    completion_xp_reward,
    budget_limit,
    currency
  ) VALUES (
    v_clean_name,
    COALESCE(p_description, ''),
    v_caller_id,
    'ACTIVE',
    COALESCE(p_completion_xp_reward, 100),
    GREATEST(0, COALESCE(p_budget_limit, 0)),
    v_currency
  ) RETURNING id INTO v_project_id;

  -- 2. Ensure PM is in public.project_members with status ACCEPTED
  INSERT INTO public.project_members (project_id, user_id, invitation_status)
  VALUES (v_project_id, v_caller_id, 'ACCEPTED')
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET invitation_status = 'ACCEPTED';

  -- 3. Insert additional invited members as PENDING (if provided)
  IF p_member_user_ids IS NOT NULL AND array_length(p_member_user_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_member_user_ids LOOP
      IF v_member_id IS NOT NULL AND v_member_id <> v_caller_id THEN
        INSERT INTO public.project_members (project_id, user_id, invitation_status)
        VALUES (v_project_id, v_member_id, 'PENDING')
        ON CONFLICT (project_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 4. Associate skills in public.project_skills
  IF p_skill_ids IS NOT NULL AND array_length(p_skill_ids, 1) > 0 THEN
    FOREACH v_skill_id IN ARRAY p_skill_ids LOOP
      IF v_skill_id IS NOT NULL THEN
        INSERT INTO public.project_skills (project_id, skill_id)
        VALUES (v_project_id, v_skill_id)
        ON CONFLICT (project_id, skill_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 5. Audit Log Entry
  INSERT INTO public.activity_logs (
    user_id,
    project_id,
    event_type,
    summary,
    xp_delta,
    metadata
  ) VALUES (
    v_caller_id,
    v_project_id,
    'PROJECT_CREATED',
    'Created project "' || v_clean_name || '"',
    0,
    jsonb_build_object(
      'project_name', v_clean_name,
      'budget_limit', p_budget_limit,
      'currency', v_currency
    )
  );

  RETURN v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_maker_project(TEXT, TEXT, INT, UUID[], UUID[], NUMERIC, TEXT) TO authenticated;

-- 3. Public Formulas & Showcases Discovery RPC (public.get_public_marketplace_feed)
CREATE OR REPLACE FUNCTION public.get_public_marketplace_feed(p_limit INT DEFAULT 40)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 40), 1), 100);
  v_recipes JSONB;
  v_projects JSONB;
BEGIN
  -- 1. Public Recipes
  SELECT COALESCE(
    jsonb_agg(r_row),
    '[]'::jsonb
  )
  INTO v_recipes
  FROM (
    SELECT 
      r.id,
      r.user_id,
      r.title,
      r.category,
      r.instructions_md,
      r.rating,
      r.image_url,
      r.is_public,
      r.clones_count,
      r.created_at,
      r.updated_at,
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ) AS author,
      (
        SELECT COUNT(*)::int
        FROM public.recipe_ingredients ri
        WHERE ri.recipe_id = r.id
      ) AS ingredients_count
    FROM public.maker_recipes r
    JOIN public.profiles p ON p.id = r.user_id
    WHERE r.is_public = true
      AND p.is_suspended = false
    ORDER BY r.clones_count DESC, r.created_at DESC
    LIMIT v_limit
  ) r_row;

  -- 2. Public Project Showcases
  SELECT COALESCE(
    jsonb_agg(p_row),
    '[]'::jsonb
  )
  INTO v_projects
  FROM (
    SELECT
      proj.id,
      proj.name,
      proj.description,
      proj.status,
      proj.completion_xp_reward,
      proj.is_public,
      proj.budget_limit,
      proj.currency,
      proj.created_at,
      jsonb_build_object(
        'id', pm.id,
        'username', pm.username,
        'display_name', pm.display_name,
        'avatar_url', pm.avatar_url
      ) AS pm,
      (
        SELECT COALESCE(jsonb_agg(sc.name), '[]'::jsonb)
        FROM public.project_skills ps
        JOIN public.skill_catalog sc ON sc.id = ps.skill_id
        WHERE ps.project_id = proj.id
      ) AS skill_names,
      (
        SELECT COUNT(*)::int
        FROM public.project_tasks pt
        WHERE pt.project_id = proj.id
      ) AS total_tasks,
      (
        SELECT COUNT(*)::int
        FROM public.project_tasks pt
        WHERE pt.project_id = proj.id AND pt.status = 'DONE'
      ) AS completed_tasks
    FROM public.projects proj
    JOIN public.profiles pm ON pm.id = proj.pm_user_id
    WHERE proj.is_public = true
      AND pm.is_suspended = false
    ORDER BY proj.created_at DESC
    LIMIT v_limit
  ) p_row;

  RETURN jsonb_build_object(
    'public_recipes', v_recipes,
    'public_projects', v_projects
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_marketplace_feed(INT) TO anon, authenticated;
