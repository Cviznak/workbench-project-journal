-- ==============================================================================
-- Migration 026: Workbench v3.0 Flagship Milestone Mega-Sprint
--
-- 1. RPG Achievements & Maker Trophies:
--    - public.achievements: Foundational RPG badges & XP rewards.
--    - public.user_achievements: Maker trophy unlocks with timestamps & notes.
--    - Seeding 10 foundational achievements.
-- 2. RPG Achievement Engine RPCs:
--    - evaluate_user_achievements: Auto-checks user stats & awards trophies.
--    - admin_grant_achievement_or_xp: Admin custom awards & bonus skill XP.
-- 3. Public Shareable Maker Formulas:
--    - Alter public.maker_recipes for is_public and clones_count.
--    - Update SELECT RLS policies on maker_recipes & recipe_ingredients.
--    - clone_public_recipe RPC for 1-click workshop import.
-- 4. Admin Executive Telemetry RPC:
--    - get_admin_platform_telemetry: Real-time high-density KPI metrics.
-- 5. Upgrade export_user_maker_archive to v3.0.0.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ACHIEVEMENTS & USER_ACHIEVEMENTS TABLES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  tier TEXT NOT NULL DEFAULT 'BRONZE' CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'SPECIAL')),
  xp_bonus INT NOT NULL DEFAULT 50 CHECK (xp_bonus BETWEEN 0 AND 2500),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT DEFAULT '',
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Enable Row Level Security
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- SELECT is public to everyone (unlocked trophies appear on Public Maker Profiles)
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements"
  ON public.achievements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can view user achievements" ON public.user_achievements;
CREATE POLICY "Anyone can view user achievements"
  ON public.user_achievements
  FOR SELECT
  USING (true);

-- Seed Foundational Achievements
INSERT INTO public.achievements (slug, title, description, icon, tier, xp_bonus)
VALUES
  ('first-spark', 'First Spark', 'Log your first deliberate practice session or complete a task.', 'zap', 'BRONZE', 50),
  ('streak-7', '7-Day Consistency Flame', 'Maintain a 7-day active maker streak.', 'flame', 'SILVER', 150),
  ('streak-30', '30-Day Iron Maker', 'Maintain a 30-day active maker streak.', 'shield', 'GOLD', 500),
  ('polymath-5', 'Workshop Polymath', 'Unlock and practice at least 5 distinct maker skills.', 'layers', 'SILVER', 200),
  ('quartermaster-25', 'Master Quartermaster', 'Catalog 25+ materials, tools, or finished goods in your inventory.', 'package', 'SILVER', 150),
  ('alchemist-batch', 'Master Alchemist', 'Execute 5 workshop formula batches in the recipe lab.', 'flask-conical', 'GOLD', 250),
  ('project-shipped', 'Project Shipped', 'Complete a full maker project from planning to finish.', 'check-circle', 'GOLD', 300),
  ('community-pillar', 'Community Pillar', 'Share 3+ build updates in the Maker Community feed.', 'users', 'SILVER', 150),
  ('open-source-maker', 'Open Source Maker', 'Publish a public project showcase or public workshop formula.', 'globe', 'BRONZE', 100),
  ('founder-verified', 'Workbench Pioneer', 'Special honor badge awarded by Workbench Administrators.', 'crown', 'DIAMOND', 500)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    tier = EXCLUDED.tier,
    xp_bonus = EXCLUDED.xp_bonus;

-- ------------------------------------------------------------------------------
-- 2. RPC: evaluate_user_achievements
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evaluate_user_achievements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_username TEXT;
  v_practice_count INT;
  v_completed_tasks_count INT;
  v_streak INT;
  v_longest_streak INT;
  v_skills_count INT;
  v_inventory_count INT;
  v_recipe_runs_count INT;
  v_completed_projects_count INT;
  v_posts_count INT;
  v_public_projects_count INT;
  v_public_recipes_count INT;

  v_ach public.achievements;
  v_newly_unlocked JSONB := '[]'::jsonb;
  v_should_unlock BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT username, COALESCE(current_streak, 0), COALESCE(longest_streak, 0)
  INTO v_username, v_streak, v_longest_streak
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT COUNT(*) INTO v_practice_count FROM public.practice_logs WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_completed_tasks_count FROM public.project_tasks WHERE assignee_id = v_user_id AND status = 'DONE';
  SELECT COUNT(*) INTO v_skills_count FROM public.user_skills WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_inventory_count FROM public.inventory_items WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_recipe_runs_count FROM public.recipe_runs WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_completed_projects_count FROM public.projects WHERE pm_user_id = v_user_id AND status = 'COMPLETED';
  SELECT COUNT(*) INTO v_posts_count FROM public.community_posts WHERE author_id = v_user_id;
  SELECT COUNT(*) INTO v_public_projects_count FROM public.projects WHERE pm_user_id = v_user_id AND is_public = true;
  SELECT COUNT(*) INTO v_public_recipes_count FROM public.maker_recipes WHERE user_id = v_user_id AND is_public = true;

  -- Iterate through achievements (excluding founder-verified which is admin-awarded only)
  FOR v_ach IN (
    SELECT * FROM public.achievements
    WHERE slug != 'founder-verified'
    ORDER BY created_at ASC
  ) LOOP
    -- Check if user already has this achievement
    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = v_user_id AND achievement_id = v_ach.id
    ) THEN
      v_should_unlock := false;

      IF v_ach.slug = 'first-spark' AND (v_practice_count >= 1 OR v_completed_tasks_count >= 1) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'streak-7' AND (v_streak >= 7 OR v_longest_streak >= 7) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'streak-30' AND (v_streak >= 30 OR v_longest_streak >= 30) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'polymath-5' AND (v_skills_count >= 5) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'quartermaster-25' AND (v_inventory_count >= 25) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'alchemist-batch' AND (v_recipe_runs_count >= 5) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'project-shipped' AND (v_completed_projects_count >= 1) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'community-pillar' AND (v_posts_count >= 3) THEN
        v_should_unlock := true;
      ELSIF v_ach.slug = 'open-source-maker' AND (v_public_projects_count >= 1 OR v_public_recipes_count >= 1) THEN
        v_should_unlock := true;
      END IF;

      IF v_should_unlock THEN
        INSERT INTO public.user_achievements (user_id, achievement_id, awarded_by, note, unlocked_at)
        VALUES (v_user_id, v_ach.id, NULL, 'Unlocked through workshop milestones.', now())
        ON CONFLICT (user_id, achievement_id) DO NOTHING;

        -- Notification
        INSERT INTO public.notifications (
          recipient_id,
          actor_id,
          notification_type,
          title,
          body,
          link_url
        ) VALUES (
          v_user_id,
          v_user_id,
          'ACHIEVEMENT_UNLOCKED',
          'Trophy Unlocked: ' || v_ach.title,
          v_ach.description || ' (+' || v_ach.xp_bonus || ' XP)',
          '/makers/' || COALESCE(v_username, '')
        );

        -- Activity log
        INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
        VALUES (
          v_user_id,
          'ACHIEVEMENT_UNLOCKED',
          'Unlocked achievement trophy: ' || v_ach.title,
          v_ach.xp_bonus,
          jsonb_build_object(
            'achievement_id', v_ach.id,
            'slug', v_ach.slug,
            'title', v_ach.title,
            'tier', v_ach.tier,
            'xp_bonus', v_ach.xp_bonus
          )
        );

        v_newly_unlocked := v_newly_unlocked || jsonb_build_object(
          'id', v_ach.id,
          'slug', v_ach.slug,
          'title', v_ach.title,
          'description', v_ach.description,
          'icon', v_ach.icon,
          'tier', v_ach.tier,
          'xp_bonus', v_ach.xp_bonus
        );
      END IF;
    END IF;
  END LOOP;

  RETURN v_newly_unlocked;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.evaluate_user_achievements() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_user_achievements() TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. RPC: admin_grant_achievement_or_xp
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_grant_achievement_or_xp(
  p_target_user_id UUID,
  p_skill_id UUID DEFAULT NULL,
  p_xp_amount INT DEFAULT 0,
  p_achievement_slug TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_target public.profiles;
  v_ach public.achievements;
  v_skill public.skill_catalog;
  v_new_xp INT;
  v_new_level INT;
  v_xp_granted INT := 0;
  v_ach_granted TEXT := NULL;
BEGIN
  -- Security check: Caller must be active ADMIN or ROOT_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  -- 1. Grant Bonus XP if specified
  IF p_xp_amount > 0 AND p_skill_id IS NOT NULL THEN
    v_xp_granted := LEAST(p_xp_amount, 2500);

    SELECT * INTO v_skill FROM public.skill_catalog WHERE id = p_skill_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target skill not found in catalog.';
    END IF;

    -- Upsert user_skills
    IF EXISTS (SELECT 1 FROM public.user_skills WHERE user_id = p_target_user_id AND skill_id = p_skill_id) THEN
      SELECT total_xp INTO v_new_xp FROM public.user_skills WHERE user_id = p_target_user_id AND skill_id = p_skill_id;
      v_new_xp := v_new_xp + v_xp_granted;
      v_new_level := floor(0.1 * sqrt(v_new_xp))::int + 1;

      UPDATE public.user_skills
      SET total_xp = v_new_xp,
          level = v_new_level,
          last_practiced_at = now()
      WHERE user_id = p_target_user_id AND skill_id = p_skill_id;
    ELSE
      v_new_xp := v_xp_granted;
      v_new_level := floor(0.1 * sqrt(v_new_xp))::int + 1;

      INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
      VALUES (p_target_user_id, p_skill_id, v_new_xp, v_new_level, now());
    END IF;

    INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
    VALUES (
      p_target_user_id,
      'ADMIN_XP_GRANT',
      'Administrator granted +' || v_xp_granted || ' XP in ' || v_skill.name,
      v_xp_granted,
      jsonb_build_object(
        'awarded_by', v_admin_id,
        'skill_id', p_skill_id,
        'skill_name', v_skill.name,
        'xp_amount', v_xp_granted,
        'reason', p_reason
      )
    );
  END IF;

  -- 2. Grant Achievement / Trophy if specified
  IF p_achievement_slug IS NOT NULL AND trim(p_achievement_slug) != '' THEN
    SELECT * INTO v_ach FROM public.achievements WHERE slug = trim(p_achievement_slug);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Achievement "%" not found.', p_achievement_slug;
    END IF;

    INSERT INTO public.user_achievements (user_id, achievement_id, awarded_by, note, unlocked_at)
    VALUES (p_target_user_id, v_ach.id, v_admin_id, trim(p_reason), now())
    ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET awarded_by = v_admin_id,
          note = trim(p_reason),
          unlocked_at = now();

    v_ach_granted := v_ach.title;

    INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
    VALUES (
      p_target_user_id,
      'ADMIN_ACHIEVEMENT_GRANTED',
      'Administrator awarded trophy: ' || v_ach.title,
      v_ach.xp_bonus,
      jsonb_build_object(
        'awarded_by', v_admin_id,
        'achievement_id', v_ach.id,
        'achievement_slug', v_ach.slug,
        'achievement_title', v_ach.title,
        'reason', p_reason
      )
    );
  END IF;

  -- Dispatch notification to recipient
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    title,
    body,
    link_url
  ) VALUES (
    p_target_user_id,
    v_admin_id,
    'ADMIN_AWARD_GRANTED',
    'Special Honor from Workbench Admins',
    CASE 
      WHEN v_ach_granted IS NOT NULL AND v_xp_granted > 0 THEN
        'You were awarded "' || v_ach_granted || '" and +' || v_xp_granted || ' Bonus XP! ' || trim(p_reason)
      WHEN v_ach_granted IS NOT NULL THEN
        'You were awarded the "' || v_ach_granted || '" badge! ' || trim(p_reason)
      ELSE
        'You were awarded +' || v_xp_granted || ' Bonus XP! ' || trim(p_reason)
    END,
    '/makers/' || COALESCE(v_target.username, '')
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_username', v_target.username,
    'xp_granted', v_xp_granted,
    'achievement_granted', v_ach_granted
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_achievement_or_xp FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_achievement_or_xp TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. PUBLIC SHAREABLE MAKER FORMULAS & CLONING ENGINE
-- ------------------------------------------------------------------------------

-- Alter public.maker_recipes for public sharing & cloning
ALTER TABLE public.maker_recipes
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clones_count INT NOT NULL DEFAULT 0 CHECK (clones_count >= 0);

-- Update RLS on maker_recipes
DROP POLICY IF EXISTS "Users can manage own recipes" ON public.maker_recipes;
DROP POLICY IF EXISTS "Users can view recipes" ON public.maker_recipes;
DROP POLICY IF EXISTS "Users can insert recipes" ON public.maker_recipes;
DROP POLICY IF EXISTS "Users can update recipes" ON public.maker_recipes;
DROP POLICY IF EXISTS "Users can delete recipes" ON public.maker_recipes;

CREATE POLICY "Users can view recipes"
  ON public.maker_recipes
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id OR is_public = true);

CREATE POLICY "Users can insert recipes"
  ON public.maker_recipes
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update recipes"
  ON public.maker_recipes
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete recipes"
  ON public.maker_recipes
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- Update RLS on recipe_ingredients
DROP POLICY IF EXISTS "Users can view own recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Users can view recipe ingredients"
  ON public.recipe_ingredients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maker_recipes mr
      WHERE mr.id = recipe_ingredients.recipe_id
        AND (mr.user_id = (SELECT auth.uid()) OR mr.is_public = true)
    )
  );

-- RPC: clone_public_recipe
CREATE OR REPLACE FUNCTION public.clone_public_recipe(
  p_source_recipe_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_source public.maker_recipes;
  v_new_recipe_id UUID;
  v_ing RECORD;
  v_author_username TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to clone a workshop formula.';
  END IF;

  SELECT * INTO v_source
  FROM public.maker_recipes
  WHERE id = p_source_recipe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Formula not found.';
  END IF;

  IF NOT v_source.is_public AND v_source.user_id != v_user_id THEN
    RAISE EXCEPTION 'This formula is private and cannot be cloned.';
  END IF;

  -- Create cloned recipe in caller's workshop (is_public = false, clones_count = 0)
  INSERT INTO public.maker_recipes (
    user_id,
    title,
    category,
    instructions_md,
    rating,
    output_yield_qty,
    packaging_overhead,
    target_retail_price,
    image_url,
    is_public,
    clones_count
  )
  VALUES (
    v_user_id,
    CASE 
      WHEN v_source.user_id = v_user_id THEN v_source.title || ' (Copy)'
      ELSE v_source.title || ' (Cloned)'
    END,
    v_source.category,
    v_source.instructions_md,
    v_source.rating,
    v_source.output_yield_qty,
    v_source.packaging_overhead,
    v_source.target_retail_price,
    v_source.image_url,
    false,
    0
  )
  RETURNING id INTO v_new_recipe_id;

  -- Clone recipe ingredients if any
  FOR v_ing IN (SELECT * FROM public.recipe_ingredients WHERE recipe_id = p_source_recipe_id) LOOP
    INSERT INTO public.recipe_ingredients (
      recipe_id,
      inventory_item_id,
      quantity_required
    )
    VALUES (
      v_new_recipe_id,
      v_ing.inventory_item_id,
      v_ing.quantity_required
    );
  END LOOP;

  -- Increment clones_count on source recipe
  UPDATE public.maker_recipes
  SET clones_count = clones_count + 1
  WHERE id = p_source_recipe_id;

  -- Notify original recipe author if someone else cloned it
  IF v_source.user_id != v_user_id THEN
    SELECT username INTO v_author_username FROM public.profiles WHERE id = v_user_id;

    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      title,
      body,
      link_url
    ) VALUES (
      v_source.user_id,
      v_user_id,
      'RECIPE_CLONED',
      'Maker cloned your workshop formula',
      COALESCE('@' || v_author_username, 'A maker') || ' cloned your formula "' || v_source.title || '" to their workshop lab.',
      '/inventory'
    );
  END IF;

  -- Audit log
  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_user_id,
    'RECIPE_CLONED',
    'Cloned formula "' || v_source.title || '" to workshop',
    0,
    jsonb_build_object(
      'source_recipe_id', p_source_recipe_id,
      'new_recipe_id', v_new_recipe_id,
      'source_title', v_source.title
    )
  );

  RETURN v_new_recipe_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clone_public_recipe FROM public, anon;
GRANT EXECUTE ON FUNCTION public.clone_public_recipe TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. RPC: get_admin_platform_telemetry
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_platform_telemetry()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_telemetry JSONB;
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id
      AND role IN ('ROOT_ADMIN', 'ADMIN')
      AND is_suspended = false
  ) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'active_users_7d', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.activity_logs
      WHERE created_at >= (now() - INTERVAL '7 days')
    ),
    'suspended_users', (SELECT COUNT(*) FROM public.profiles WHERE is_suspended = true),
    'total_xp_awarded', (SELECT COALESCE(SUM(total_xp), 0)::BIGINT FROM public.user_skills),
    'total_practice_minutes', (SELECT COALESCE(SUM(duration_minutes), 0)::BIGINT FROM public.practice_logs),
    'total_skills_in_catalog', (SELECT COUNT(*) FROM public.skill_catalog),
    'total_projects', (SELECT COUNT(*) FROM public.projects),
    'public_projects_count', (SELECT COUNT(*) FROM public.projects WHERE is_public = true),
    'completed_tasks_count', (SELECT COUNT(*) FROM public.project_tasks WHERE status = 'DONE'),
    'total_inventory_items', (SELECT COUNT(*) FROM public.inventory_items),
    'total_recipes', (SELECT COUNT(*) FROM public.maker_recipes),
    'public_recipes_count', (SELECT COUNT(*) FROM public.maker_recipes WHERE is_public = true),
    'total_batch_runs', (SELECT COUNT(*) FROM public.recipe_runs),
    'total_community_posts', (SELECT COUNT(*) FROM public.community_posts),
    'total_post_comments', (SELECT COUNT(*) FROM public.post_comments),
    'open_feedback_count', (SELECT COUNT(*) FROM public.user_feedback WHERE status = 'OPEN'),
    'pending_skill_requests_count', (SELECT COUNT(*) FROM public.skill_requests WHERE status = 'PENDING'),
    'generated_at', now()
  ) INTO v_telemetry;

  RETURN v_telemetry;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_platform_telemetry FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_telemetry TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. UPGRADE export_user_maker_archive TO v3.0.0
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.export_user_maker_archive()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_archive JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'version', '3.0.0',
    'exported_at', now(),
    'profile', (
      SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_user_id
    ),
    'skills', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'skill_id', us.skill_id,
        'skill_name', sc.name,
        'skill_slug', sc.slug,
        'category', sc.category,
        'total_xp', us.total_xp,
        'level', us.level,
        'last_practiced_at', us.last_practiced_at
      ))
      FROM public.user_skills us
      JOIN public.skill_catalog sc ON us.skill_id = sc.id
      WHERE us.user_id = v_user_id
    ), '[]'::jsonb),
    'achievements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'achievement_id', ua.achievement_id,
        'slug', a.slug,
        'title', a.title,
        'tier', a.tier,
        'xp_bonus', a.xp_bonus,
        'note', ua.note,
        'unlocked_at', ua.unlocked_at
      ))
      FROM public.user_achievements ua
      JOIN public.achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = v_user_id
      ORDER BY ua.unlocked_at DESC
    ), '[]'::jsonb),
    'practice_logs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pl.id,
        'skill_name', sc.name,
        'duration_minutes', pl.duration_minutes,
        'xp_gained', pl.xp_gained,
        'note', pl.note,
        'created_at', pl.created_at
      ))
      FROM public.practice_logs pl
      LEFT JOIN public.skill_catalog sc ON pl.skill_id = sc.id
      WHERE pl.user_id = v_user_id
      ORDER BY pl.created_at DESC
    ), '[]'::jsonb),
    'workspace_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(wi))
      FROM public.workspace_items wi
      WHERE wi.user_id = v_user_id
      ORDER BY wi.created_at DESC
    ), '[]'::jsonb),
    'projects', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr))
      FROM (
        SELECT DISTINCT p.*
        FROM public.projects p
        LEFT JOIN public.project_members pm ON p.id = pm.project_id
        WHERE p.pm_user_id = v_user_id OR pm.user_id = v_user_id
        ORDER BY p.created_at DESC
      ) pr
    ), '[]'::jsonb),
    'tasks', COALESCE((
      SELECT jsonb_agg(to_jsonb(pt))
      FROM public.project_tasks pt
      WHERE pt.assignee_id = v_user_id
         OR pt.project_id IN (
           SELECT p.id FROM public.projects p WHERE p.pm_user_id = v_user_id
         )
      ORDER BY pt.created_at DESC
    ), '[]'::jsonb),
    'comments', COALESCE((
      SELECT jsonb_agg(to_jsonb(tc))
      FROM public.task_comments tc
      WHERE tc.user_id = v_user_id
      ORDER BY tc.created_at DESC
    ), '[]'::jsonb),
    'inventory_folders', COALESCE((
      SELECT jsonb_agg(to_jsonb(f))
      FROM public.inventory_folders f
      WHERE f.user_id = v_user_id
      ORDER BY f.name ASC
    ), '[]'::jsonb),
    'inventory_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i))
      FROM public.inventory_items i
      WHERE i.user_id = v_user_id
      ORDER BY i.name ASC
    ), '[]'::jsonb),
    'task_materials', COALESCE((
      SELECT jsonb_agg(to_jsonb(tm))
      FROM public.task_materials tm
      JOIN public.project_tasks pt ON tm.task_id = pt.id
      WHERE pt.assignee_id = v_user_id
         OR pt.project_id IN (
           SELECT p.id FROM public.projects p WHERE p.pm_user_id = v_user_id
         )
    ), '[]'::jsonb),
    'maker_recipes', COALESCE((
      SELECT jsonb_agg(to_jsonb(mr))
      FROM public.maker_recipes mr
      WHERE mr.user_id = v_user_id
      ORDER BY mr.created_at DESC
    ), '[]'::jsonb),
    'recipe_ingredients', COALESCE((
      SELECT jsonb_agg(to_jsonb(ri))
      FROM public.recipe_ingredients ri
      JOIN public.maker_recipes mr ON ri.recipe_id = mr.id
      WHERE mr.user_id = v_user_id
    ), '[]'::jsonb),
    'recipe_runs', COALESCE((
      SELECT jsonb_agg(to_jsonb(rr))
      FROM public.recipe_runs rr
      WHERE rr.user_id = v_user_id
      ORDER BY rr.created_at DESC
    ), '[]'::jsonb),
    'community_posts', COALESCE((
      SELECT jsonb_agg(to_jsonb(cp))
      FROM public.community_posts cp
      WHERE cp.author_id = v_user_id
      ORDER BY cp.created_at DESC
    ), '[]'::jsonb),
    'user_feedback', COALESCE((
      SELECT jsonb_agg(to_jsonb(uf))
      FROM public.user_feedback uf
      WHERE uf.user_id = v_user_id
      ORDER BY uf.created_at DESC
    ), '[]'::jsonb),
    'activity_logs', COALESCE((
      SELECT jsonb_agg(to_jsonb(al))
      FROM public.activity_logs al
      WHERE al.user_id = v_user_id
      ORDER BY al.created_at DESC
    ), '[]'::jsonb)
  ) INTO v_archive;

  RETURN v_archive;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.export_user_maker_archive() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.export_user_maker_archive() TO authenticated;
