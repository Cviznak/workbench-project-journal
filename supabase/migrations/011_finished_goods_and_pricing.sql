-- Migration 011: Finished Creations Gallery, Unit Economics & Margin Simulator

-- 1. Expand public.inventory_items item_type CHECK to include 'FINISHED_GOOD'
ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_item_type_check;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_item_type_check
  CHECK (item_type IN ('MATERIAL', 'EQUIPMENT', 'FINISHED_GOOD'));

-- 2. Expand public.maker_recipes with output finished good link & unit economics fields
ALTER TABLE public.maker_recipes
  ADD COLUMN IF NOT EXISTS output_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS output_yield_qty NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (output_yield_qty > 0),
  ADD COLUMN IF NOT EXISTS packaging_overhead NUMERIC(10, 2) NOT NULL DEFAULT 4.50 CHECK (packaging_overhead >= 0),
  ADD COLUMN IF NOT EXISTS target_retail_price NUMERIC(10, 2) DEFAULT 0 CHECK (target_retail_price >= 0);

CREATE INDEX IF NOT EXISTS idx_maker_recipes_output_item ON public.maker_recipes(output_item_id);

-- 3. Update execute_maker_recipe RPC to automatically increment finished good stock, calculate COGS, and grant +15 XP
CREATE OR REPLACE FUNCTION public.execute_maker_recipe(
  p_recipe_id UUID,
  p_batch_multiplier NUMERIC DEFAULT 1
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
  v_craft_skill_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_batch_multiplier IS NULL OR p_batch_multiplier <= 0 THEN
    RAISE EXCEPTION 'Batch multiplier must be greater than 0';
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

  -- If recipe has an output finished good item, increment stock and set unit_price to unit COGS
  IF v_recipe.output_item_id IS NOT NULL THEN
    v_produced_qty := v_recipe.output_yield_qty * p_batch_multiplier;

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
  END IF;

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
      'multiplier', p_batch_multiplier,
      'ingredients_deducted', v_deducted_count,
      'produced_qty', v_produced_qty,
      'output_item_id', v_recipe.output_item_id,
      'unit_cogs', ROUND(v_unit_cogs, 2),
      'xp_awarded', 15
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'recipe_id', p_recipe_id,
    'multiplier', p_batch_multiplier,
    'ingredients_deducted', v_deducted_count,
    'produced_qty', v_produced_qty,
    'unit_cogs', ROUND(v_unit_cogs, 2),
    'xp_awarded', 15
  );
END;
$$;

-- 4. Update export_user_maker_archive to version 1.6.0
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
    'version', '1.6.0',
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
