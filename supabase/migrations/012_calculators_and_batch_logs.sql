-- Migration 012: Interactive Maker Calculators, Recipe Batch Run Logs & Workspace Blueprints

-- 1. Create public.recipe_runs for logging formula execution history
CREATE TABLE IF NOT EXISTS public.recipe_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.maker_recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_multiplier NUMERIC(10, 2) NOT NULL DEFAULT 1,
  units_produced NUMERIC(10, 2) NOT NULL DEFAULT 1,
  total_batch_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_cogs NUMERIC(10, 2) NOT NULL DEFAULT 0,
  outcome_rating INT CHECK (outcome_rating BETWEEN 1 AND 5),
  batch_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_runs_recipe ON public.recipe_runs(recipe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_runs_user ON public.recipe_runs(user_id);

ALTER TABLE public.recipe_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe runs"
ON public.recipe_runs FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own recipe runs"
ON public.recipe_runs FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own recipe runs"
ON public.recipe_runs FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own recipe runs"
ON public.recipe_runs FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Enable Realtime on recipe_runs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'recipe_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_runs;
  END IF;
END $$;

-- 2. Add metadata_json to public.workspace_items for color swatches, checklists, and references
ALTER TABLE public.workspace_items
ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Upgrade execute_maker_recipe RPC to record batch runs into public.recipe_runs
DROP FUNCTION IF EXISTS public.execute_maker_recipe(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.execute_maker_recipe(UUID);

CREATE OR REPLACE FUNCTION public.execute_maker_recipe(
  p_recipe_id UUID,
  p_batch_multiplier NUMERIC DEFAULT 1,
  p_batch_notes TEXT DEFAULT '',
  p_outcome_rating INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_recipe RECORD;
  v_ing RECORD;
  v_deducted_count INT := 0;
  v_needed NUMERIC;
  v_batch_ingredients_cost NUMERIC := 0;
  v_unit_cogs NUMERIC := 0;
  v_output_item RECORD;
  v_produced_qty NUMERIC := 0;
  v_actual_units_produced NUMERIC := 0;
  v_total_batch_cost NUMERIC := 0;
  v_craft_skill_id UUID;
  v_run_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_batch_multiplier IS NULL OR p_batch_multiplier <= 0 THEN
    RAISE EXCEPTION 'Batch multiplier must be greater than 0';
  END IF;

  IF p_outcome_rating IS NOT NULL AND (p_outcome_rating < 1 OR p_outcome_rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  SELECT * INTO v_recipe
  FROM public.maker_recipes
  WHERE id = p_recipe_id AND user_id = v_user_id;

  IF v_recipe.id IS NULL THEN
    RAISE EXCEPTION 'Recipe not found or access denied';
  END IF;

  -- Iterate through recipe ingredients and deduct stock
  FOR v_ing IN
    SELECT ri.inventory_item_id, ri.quantity_required, COALESCE(ii.unit_price, 0) as unit_price, ii.name as item_name
    FROM public.recipe_ingredients ri
    JOIN public.inventory_items ii ON ri.inventory_item_id = ii.id
    WHERE ri.recipe_id = p_recipe_id
  LOOP
    v_needed := v_ing.quantity_required * p_batch_multiplier;
    v_batch_ingredients_cost := v_batch_ingredients_cost + (v_ing.quantity_required * v_ing.unit_price);

    UPDATE public.inventory_items
    SET quantity = GREATEST(0, quantity - v_needed),
        in_restock_cart = CASE
          WHEN (quantity - v_needed) <= low_stock_threshold AND item_type = 'MATERIAL' THEN true
          ELSE in_restock_cart
        END,
        updated_at = now()
    WHERE id = v_ing.inventory_item_id AND user_id = v_user_id;

    v_deducted_count := v_deducted_count + 1;
  END LOOP;

  -- Calculate unit COGS: (ingredients cost per batch / yield) + packaging_overhead
  IF COALESCE(v_recipe.output_yield_qty, 1) > 0 THEN
    v_unit_cogs := (v_batch_ingredients_cost / v_recipe.output_yield_qty) + COALESCE(v_recipe.packaging_overhead, 4.50);
  ELSE
    v_unit_cogs := v_batch_ingredients_cost + COALESCE(v_recipe.packaging_overhead, 4.50);
  END IF;

  v_total_batch_cost := ROUND(v_batch_ingredients_cost * p_batch_multiplier, 2);

  -- If recipe has an output finished good item, increment stock and set unit_price to unit COGS
  IF v_recipe.output_item_id IS NOT NULL THEN
    v_produced_qty := v_recipe.output_yield_qty * p_batch_multiplier;
    v_actual_units_produced := v_produced_qty;

    SELECT * INTO v_output_item
    FROM public.inventory_items
    WHERE id = v_recipe.output_item_id AND user_id = v_user_id;

    IF v_output_item.id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity = quantity + v_produced_qty,
          unit_price = ROUND(v_unit_cogs, 2),
          updated_at = now()
      WHERE id = v_recipe.output_item_id;
    END IF;
  ELSE
    v_actual_units_produced := COALESCE(v_recipe.output_yield_qty, 1) * p_batch_multiplier;
  END IF;

  -- Insert run into public.recipe_runs
  INSERT INTO public.recipe_runs (
    recipe_id,
    user_id,
    batch_multiplier,
    units_produced,
    total_batch_cost,
    unit_cogs,
    outcome_rating,
    batch_notes
  ) VALUES (
    p_recipe_id,
    v_user_id,
    p_batch_multiplier,
    v_actual_units_produced,
    v_total_batch_cost,
    ROUND(v_unit_cogs, 2),
    p_outcome_rating,
    COALESCE(p_batch_notes, '')
  ) RETURNING id INTO v_run_id;

  -- Grant +15 XP for deliberate production batch
  SELECT id INTO v_craft_skill_id FROM public.skill_catalog WHERE slug = 'general-crafting' LIMIT 1;
  IF v_craft_skill_id IS NULL THEN
    INSERT INTO public.skill_catalog (slug, name, category)
    VALUES ('general-crafting', 'General Crafting', 'General')
    RETURNING id INTO v_craft_skill_id;
  END IF;

  INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
  VALUES (v_user_id, v_craft_skill_id, 15, public.calculate_skill_level(15), now())
  ON CONFLICT (user_id, skill_id) DO UPDATE SET
    total_xp = user_skills.total_xp + 15,
    level = public.calculate_skill_level(user_skills.total_xp + 15),
    last_practiced_at = now();

  -- Touch consistency streak
  PERFORM public.touch_user_streak(v_user_id);

  -- Log recipe execution in activity ledger
  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_user_id,
    'RECIPE_EXECUTED',
    'Executed formula "' || v_recipe.title || '" (' || p_batch_multiplier || 'x batch' || 
      CASE WHEN v_produced_qty > 0 THEN ', +' || v_produced_qty || ' finished units' ELSE '' END || ') (+15 XP)',
    15,
    jsonb_build_object(
      'recipe_id', p_recipe_id,
      'recipe_title', v_recipe.title,
      'run_id', v_run_id,
      'multiplier', p_batch_multiplier,
      'ingredients_deducted', v_deducted_count,
      'produced_qty', v_produced_qty,
      'units_produced', v_actual_units_produced,
      'total_batch_cost', v_total_batch_cost,
      'output_item_id', v_recipe.output_item_id,
      'unit_cogs', ROUND(v_unit_cogs, 2),
      'outcome_rating', p_outcome_rating,
      'batch_notes', p_batch_notes,
      'xp_awarded', 15
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'recipe_id', p_recipe_id,
    'run_id', v_run_id,
    'multiplier', p_batch_multiplier,
    'ingredients_deducted', v_deducted_count,
    'produced_qty', v_produced_qty,
    'units_produced', v_actual_units_produced,
    'total_batch_cost', v_total_batch_cost,
    'unit_cogs', ROUND(v_unit_cogs, 2),
    'outcome_rating', p_outcome_rating,
    'batch_notes', p_batch_notes,
    'xp_awarded', 15
  );
END;
$$;

-- 4. Update export_user_maker_archive to version 1.7.0
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
    'version', '1.7.0',
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
