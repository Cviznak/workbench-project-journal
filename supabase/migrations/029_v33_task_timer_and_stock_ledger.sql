-- ============================================================================
-- Migration 029: Task Time-Tracking & Inventory Stock Ledger (v3.3.0)
-- 1. Adds actual_minutes to public.project_tasks
-- 2. Creates public.log_task_work_session RPC with XP award and streak touch
-- 3. Creates public.inventory_transactions table, indexes, and RLS
-- 4. Creates trigger on public.inventory_items to log every stock movement
-- 5. Updates complete_project_task & execute_maker_recipe to set session tags
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add actual_minutes to project_tasks
-- ----------------------------------------------------------------------------
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS actual_minutes INT NOT NULL DEFAULT 0 CHECK (actual_minutes >= 0 AND actual_minutes <= 60000);

-- ----------------------------------------------------------------------------
-- 2. RPC: log_task_work_session
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_task_work_session(
  p_task_id UUID,
  p_duration_minutes INT,
  p_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_task public.project_tasks%ROWTYPE;
  v_new_actual INT;
  v_new_status TEXT;
  v_xp_gained INT := 0;
  v_skill_id UUID;
  v_skill_name TEXT;
  v_note TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 600 THEN
    RAISE EXCEPTION 'Work session duration must be between 1 and 600 minutes';
  END IF;

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

  -- 1. Compute new actual minutes & status transition
  v_new_actual := LEAST(60000, v_task.actual_minutes + p_duration_minutes);
  v_new_status := v_task.status;
  IF v_task.status = 'TODO' THEN
    v_new_status := 'IN_PROGRESS';
  END IF;

  UPDATE public.project_tasks
  SET actual_minutes = v_new_actual,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_task_id;

  -- 2. Determine linked skill (task.skill_id or project_skills)
  v_skill_id := v_task.skill_id;
  IF v_skill_id IS NULL THEN
    SELECT skill_id INTO v_skill_id
    FROM public.project_skills
    WHERE project_id = v_task.project_id
    LIMIT 1;
  END IF;

  v_note := 'Task Work: ' || v_task.title || CASE WHEN trim(COALESCE(p_note, '')) <> '' THEN ' — ' || trim(p_note) ELSE '' END;

  IF v_skill_id IS NOT NULL THEN
    SELECT name INTO v_skill_name
    FROM public.skill_catalog
    WHERE id = v_skill_id;

    v_xp_gained := p_duration_minutes * 2;

    -- Upsert user_skills
    INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
    VALUES (
      v_caller_id,
      v_skill_id,
      v_xp_gained,
      public.calculate_skill_level(v_xp_gained),
      now()
    )
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      total_xp = user_skills.total_xp + v_xp_gained,
      level = public.calculate_skill_level(user_skills.total_xp + v_xp_gained),
      last_practiced_at = now();

    -- Insert practice log
    INSERT INTO public.practice_logs (user_id, skill_id, duration_minutes, xp_gained, note)
    VALUES (v_caller_id, v_skill_id, p_duration_minutes, v_xp_gained, v_note);

    -- Touch streak
    PERFORM public.touch_user_streak(v_caller_id);

    -- Log to activity ledger
    INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
    VALUES (
      v_caller_id,
      v_task.project_id,
      'TASK_WORK_LOGGED',
      'Logged ' || p_duration_minutes || 'm on "' || v_task.title || '" (+' || v_xp_gained || ' XP in ' || COALESCE(v_skill_name, 'Skill') || ')',
      v_xp_gained,
      jsonb_build_object(
        'task_id', v_task.id,
        'task_title', v_task.title,
        'duration_minutes', p_duration_minutes,
        'skill_id', v_skill_id,
        'actual_minutes', v_new_actual
      )
    );
  ELSE
    -- No linked skill: touch streak and log activity with 0 XP delta
    PERFORM public.touch_user_streak(v_caller_id);

    INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
    VALUES (
      v_caller_id,
      v_task.project_id,
      'TASK_WORK_LOGGED',
      'Logged ' || p_duration_minutes || 'm on "' || v_task.title || '"',
      0,
      jsonb_build_object(
        'task_id', v_task.id,
        'task_title', v_task.title,
        'duration_minutes', p_duration_minutes,
        'actual_minutes', v_new_actual
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'actual_minutes', v_new_actual,
    'xp_gained', v_xp_gained,
    'new_status', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_task_work_session(UUID, INT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Inventory Stock Movement History Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta_qty NUMERIC(10, 2) NOT NULL,
  quantity_after NUMERIC(10, 2) NOT NULL,
  reason_type TEXT NOT NULL DEFAULT 'MANUAL' CHECK (reason_type IN ('MANUAL', 'RESTOCK_CART', 'TASK_BOM', 'RECIPE_BATCH', 'CSV_IMPORT')),
  reference_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id_created 
  ON public.inventory_transactions (item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id_created 
  ON public.inventory_transactions (user_id, created_at DESC);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can manage own inventory transactions"
  ON public.inventory_transactions
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 4. Inventory Quantity Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_inventory_quantity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delta NUMERIC(10, 2);
  v_reason TEXT;
  v_note TEXT;
  v_user_id UUID;
BEGIN
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    v_delta := NEW.quantity - OLD.quantity;
    v_user_id := COALESCE(auth.uid(), NEW.user_id);

    -- Retrieve transaction session context if set by an RPC
    v_reason := NULLIF(current_setting('workbench.stock_reason', true), '');
    v_note := NULLIF(current_setting('workbench.stock_note', true), '');

    -- Infer restock cart reception if clearing cart while adding stock
    IF (v_reason IS NULL OR v_reason = 'MANUAL') AND OLD.in_restock_cart = true AND NEW.in_restock_cart = false AND v_delta > 0 THEN
      v_reason := 'RESTOCK_CART';
      IF v_note IS NULL THEN
        v_note := 'Received restock shipment (+' || v_delta || ')';
      END IF;
    END IF;

    IF v_reason IS NULL OR v_reason NOT IN ('MANUAL', 'RESTOCK_CART', 'TASK_BOM', 'RECIPE_BATCH', 'CSV_IMPORT') THEN
      v_reason := 'MANUAL';
    END IF;

    IF v_note IS NULL THEN
      IF v_delta > 0 THEN
        v_note := 'Stock added (+' || v_delta || ')';
      ELSE
        v_note := 'Stock consumed (' || v_delta || ')';
      END IF;
    END IF;

    INSERT INTO public.inventory_transactions (
      item_id,
      user_id,
      delta_qty,
      quantity_after,
      reason_type,
      reference_note,
      created_at
    ) VALUES (
      NEW.id,
      v_user_id,
      v_delta,
      NEW.quantity,
      v_reason,
      v_note,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inventory_quantity_change ON public.inventory_items;

CREATE TRIGGER trg_log_inventory_quantity_change
  AFTER UPDATE OF quantity ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_inventory_quantity_change();

-- Initial quantity trigger on insert
CREATE OR REPLACE FUNCTION public.fn_log_inventory_quantity_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_reason TEXT;
  v_note TEXT;
BEGIN
  IF NEW.quantity > 0 THEN
    v_user_id := COALESCE(auth.uid(), NEW.user_id);
    v_reason := COALESCE(NULLIF(current_setting('workbench.stock_reason', true), ''), 'MANUAL');
    IF v_reason NOT IN ('MANUAL', 'RESTOCK_CART', 'TASK_BOM', 'RECIPE_BATCH', 'CSV_IMPORT') THEN
      v_reason := 'MANUAL';
    END IF;
    v_note := COALESCE(NULLIF(current_setting('workbench.stock_note', true), ''), 'Initial stock creation');

    INSERT INTO public.inventory_transactions (
      item_id,
      user_id,
      delta_qty,
      quantity_after,
      reason_type,
      reference_note,
      created_at
    ) VALUES (
      NEW.id,
      v_user_id,
      NEW.quantity,
      NEW.quantity,
      v_reason,
      v_note,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inventory_quantity_insert ON public.inventory_items;

CREATE TRIGGER trg_log_inventory_quantity_insert
  AFTER INSERT ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_inventory_quantity_insert();

-- ----------------------------------------------------------------------------
-- 5. Update complete_project_task to set session context for TASK_BOM
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_project_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_caller_id UUID := auth.uid();
  v_task RECORD;
  v_assignee_id UUID;
  v_skill_id UUID;
  v_xp_reward INT;
  v_proj RECORD;
  v_prereq RECORD;
  v_mat RECORD;
  v_materials_deducted INT := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_task
  FROM public.project_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.status = 'DONE' AND v_task.xp_awarded THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_done', true,
      'task_id', p_task_id,
      'xp_awarded', 0
    );
  END IF;

  IF NOT public.is_project_member(v_task.project_id) THEN
    RAISE EXCEPTION 'Forbidden: You are not a member of this project';
  END IF;

  -- Enforce prerequisite dependency check
  IF v_task.prerequisite_task_id IS NOT NULL THEN
    SELECT id, title, status INTO v_prereq
    FROM public.project_tasks
    WHERE id = v_task.prerequisite_task_id;

    IF v_prereq.id IS NOT NULL AND v_prereq.status != 'DONE' THEN
      RAISE EXCEPTION 'Cannot complete task: prerequisite task "%" must be completed first.', v_prereq.title;
    END IF;
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = v_task.project_id;

  v_assignee_id := COALESCE(v_task.assignee_id, v_caller_id);
  v_xp_reward := v_task.xp_reward;

  v_skill_id := v_task.skill_id;
  IF v_skill_id IS NULL THEN
    SELECT skill_id INTO v_skill_id
    FROM public.project_skills
    WHERE project_id = v_task.project_id
    LIMIT 1;
  END IF;

  IF v_skill_id IS NULL THEN
    SELECT id INTO v_skill_id FROM public.skill_catalog WHERE slug = 'general-crafting' LIMIT 1;
    IF v_skill_id IS NULL THEN
      INSERT INTO public.skill_catalog (slug, name, category)
      VALUES ('general-crafting', 'General Crafting', 'General')
      RETURNING id INTO v_skill_id;
    END IF;
  END IF;

  -- Move status to DONE
  UPDATE public.project_tasks
  SET status = 'DONE',
      assignee_id = v_assignee_id,
      updated_at = now()
  WHERE id = p_task_id;

  -- Tag session for stock deduction
  PERFORM set_config('workbench.stock_reason', 'TASK_BOM', true);
  PERFORM set_config('workbench.stock_note', 'BOM deduction for task: ' || v_task.title, true);

  -- Auto-deduct task materials from inventory if not deducted yet
  FOR v_mat IN
    SELECT tm.id, tm.inventory_item_id, tm.quantity_required
    FROM public.task_materials tm
    WHERE tm.task_id = p_task_id AND tm.deducted = false
  LOOP
    UPDATE public.inventory_items
    SET quantity = GREATEST(0, quantity - v_mat.quantity_required),
        in_restock_cart = CASE
          WHEN (quantity - v_mat.quantity_required) <= low_stock_threshold AND item_type = 'MATERIAL' THEN true
          ELSE in_restock_cart
        END,
        updated_at = now()
    WHERE id = v_mat.inventory_item_id;

    UPDATE public.task_materials
    SET deducted = true
    WHERE id = v_mat.id;

    v_materials_deducted := v_materials_deducted + 1;
  END LOOP;

  -- Award XP only if not awarded yet
  IF NOT v_task.xp_awarded THEN
    PERFORM public.touch_user_streak(v_assignee_id);

    INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
    VALUES (v_assignee_id, v_skill_id, v_xp_reward, public.calculate_skill_level(v_xp_reward), now())
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      total_xp = user_skills.total_xp + v_xp_reward,
      level = public.calculate_skill_level(user_skills.total_xp + v_xp_reward),
      last_practiced_at = now();

    UPDATE public.project_tasks
    SET xp_awarded = true
    WHERE id = p_task_id;

    INSERT INTO public.activity_logs (
      user_id,
      project_id,
      event_type,
      summary,
      xp_delta,
      metadata
    ) VALUES (
      v_caller_id,
      v_task.project_id,
      'TASK_COMPLETED',
      'Completed task "' || v_task.title || '" (+' || v_xp_reward || ' XP awarded to @' ||
        COALESCE((SELECT username FROM public.profiles WHERE id = v_assignee_id), 'user') || ')',
      v_xp_reward,
      jsonb_build_object(
        'task_id', p_task_id,
        'task_title', v_task.title,
        'assignee_id', v_assignee_id,
        'skill_id', v_skill_id,
        'materials_deducted', v_materials_deducted
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'xp_awarded', v_xp_reward,
    'materials_deducted', v_materials_deducted
  );
END;
$func$;

-- ----------------------------------------------------------------------------
-- 6. Update execute_maker_recipe to set session context for RECIPE_BATCH
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_maker_recipe(
  p_recipe_id UUID,
  p_batch_multiplier NUMERIC DEFAULT 1,
  p_batch_notes TEXT DEFAULT '',
  p_outcome_rating INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- Tag session for batch deduction
  PERFORM set_config('workbench.stock_reason', 'RECIPE_BATCH', true);
  PERFORM set_config('workbench.stock_note', 'Batch consumption: ' || v_recipe.title, true);

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
      PERFORM set_config('workbench.stock_reason', 'RECIPE_BATCH', true);
      PERFORM set_config('workbench.stock_note', 'Batch yield produced: ' || v_recipe.title, true);

      UPDATE public.inventory_items
      SET quantity = quantity + v_produced_qty,
          unit_price = ROUND(v_unit_cogs, 2),
          updated_at = now()
      WHERE id = v_recipe.output_item_id;
    END IF;
  END IF;

  -- Record past batch run log
  INSERT INTO public.recipe_runs (
    recipe_id,
    user_id,
    batch_multiplier,
    rating,
    notes,
    executed_at
  ) VALUES (
    p_recipe_id,
    v_user_id,
    p_batch_multiplier,
    p_outcome_rating,
    COALESCE(p_batch_notes, ''),
    now()
  )
  RETURNING id INTO v_run_id;

  -- Touch maker streak & award +15 XP
  PERFORM public.touch_user_streak(v_user_id);

  SELECT id INTO v_craft_skill_id
  FROM public.skill_catalog
  WHERE slug = 'general-crafting'
  LIMIT 1;

  IF v_craft_skill_id IS NOT NULL THEN
    INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
    VALUES (v_user_id, v_craft_skill_id, 15, public.calculate_skill_level(15), now())
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      total_xp = user_skills.total_xp + 15,
      level = public.calculate_skill_level(user_skills.total_xp + 15),
      last_practiced_at = now();
  END IF;

  -- Record audit log
  INSERT INTO public.activity_logs (
    user_id,
    event_type,
    summary,
    xp_delta,
    metadata
  ) VALUES (
    v_user_id,
    'RECIPE_EXECUTED',
    'Executed batch run for formula "' || v_recipe.title || '" (x' || p_batch_multiplier || ')',
    15,
    jsonb_build_object(
      'recipe_id', p_recipe_id,
      'recipe_title', v_recipe.title,
      'multiplier', p_batch_multiplier,
      'ingredients_deducted', v_deducted_count,
      'unit_cogs', ROUND(v_unit_cogs, 2),
      'output_produced', v_actual_units_produced,
      'run_id', v_run_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'recipe_id', p_recipe_id,
    'ingredients_deducted', v_deducted_count,
    'units_produced', v_actual_units_produced,
    'unit_cogs', ROUND(v_unit_cogs, 2),
    'batch_total_cost', v_total_batch_cost,
    'run_id', v_run_id
  );
END;
$$;
