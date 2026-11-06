-- ==============================================================================
-- Migration: 027_v31_roadmap_equipment_logs_and_csv.sql
-- Workbench v3.1: Task Due Dates, Equipment Maintenance Ledger, CSV Importer
-- ==============================================================================

-- 1. Task Due Dates & Estimated Effort on public.project_tasks
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_minutes INT DEFAULT 0 CHECK (estimated_minutes >= 0 AND estimated_minutes <= 60000);

-- 2. Maintenance Intervals on public.inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS last_maintained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_interval_days INT DEFAULT 0 CHECK (maintenance_interval_days >= 0 AND maintenance_interval_days <= 3650);

-- 3. Equipment Maintenance & Calibration Logbook (public.equipment_logs)
CREATE TABLE IF NOT EXISTS public.equipment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'MAINTENANCE' CHECK (action_type IN ('MAINTENANCE', 'CALIBRATION', 'REPAIR', 'PART_SWAP', 'INSPECTION')),
  summary TEXT NOT NULL CHECK (char_length(trim(summary)) BETWEEN 1 AND 500),
  cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  condition_after TEXT NOT NULL DEFAULT 'GOOD' CHECK (condition_after IN ('GOOD', 'NEEDS_MAINTENANCE', 'REPLACE')),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_logs_item ON public.equipment_logs(item_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_user ON public.equipment_logs(user_id);

ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_logs_user_all" ON public.equipment_logs;
CREATE POLICY "equipment_logs_user_all" ON public.equipment_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. RPC: Log Equipment Maintenance & Calibration
CREATE OR REPLACE FUNCTION public.log_equipment_maintenance(
  p_item_id UUID,
  p_action_type TEXT,
  p_summary TEXT,
  p_cost NUMERIC DEFAULT 0,
  p_condition_after TEXT DEFAULT 'GOOD'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_log_id UUID;
  v_action TEXT;
  v_summary TEXT;
  v_cost NUMERIC;
  v_condition TEXT;
  v_skill_id UUID;
  v_current_xp BIGINT;
  v_new_xp BIGINT;
  v_new_level INT;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Validate item ownership and type
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipment item not found or unauthorized.';
  END IF;

  -- Sanitize inputs
  v_action := UPPER(TRIM(COALESCE(p_action_type, 'MAINTENANCE')));
  IF v_action NOT IN ('MAINTENANCE', 'CALIBRATION', 'REPAIR', 'PART_SWAP', 'INSPECTION') THEN
    v_action := 'MAINTENANCE';
  END IF;

  v_summary := TRIM(COALESCE(p_summary, ''));
  IF char_length(v_summary) < 1 THEN
    RAISE EXCEPTION 'Maintenance summary is required.';
  END IF;
  IF char_length(v_summary) > 500 THEN
    v_summary := SUBSTRING(v_summary FROM 1 FOR 500);
  END IF;

  v_cost := GREATEST(0, COALESCE(p_cost, 0));

  v_condition := UPPER(TRIM(COALESCE(p_condition_after, 'GOOD')));
  IF v_condition NOT IN ('GOOD', 'NEEDS_MAINTENANCE', 'REPLACE') THEN
    v_condition := 'GOOD';
  END IF;

  -- Insert maintenance log row
  INSERT INTO public.equipment_logs (
    item_id,
    user_id,
    action_type,
    summary,
    cost,
    condition_after,
    performed_at
  ) VALUES (
    p_item_id,
    v_user_id,
    v_action,
    v_summary,
    v_cost,
    v_condition,
    now()
  )
  RETURNING id INTO v_log_id;

  -- Update item state
  UPDATE public.inventory_items
  SET condition = v_condition,
      last_maintained_at = now(),
      updated_at = now()
  WHERE id = p_item_id;

  -- Award +10 XP to user's first skill (if any unlocked)
  SELECT skill_id, total_xp INTO v_skill_id, v_current_xp
  FROM public.user_skills
  WHERE user_id = v_user_id
  ORDER BY total_xp DESC
  LIMIT 1;

  IF v_skill_id IS NOT NULL THEN
    v_new_xp := v_current_xp + 10;
    v_new_level := floor(0.1 * sqrt(v_new_xp))::int + 1;

    UPDATE public.user_skills
    SET total_xp = v_new_xp,
        level = v_new_level,
        last_practiced_at = now()
    WHERE user_id = v_user_id AND skill_id = v_skill_id;
  END IF;

  -- Touch maker streak
  PERFORM public.touch_user_streak(v_user_id);

  -- Log to activity ledger
  INSERT INTO public.activity_logs (
    user_id,
    event_type,
    metadata
  ) VALUES (
    v_user_id,
    'EQUIPMENT_MAINTAINED',
    jsonb_build_object(
      'item_id', p_item_id,
      'item_name', v_item.name,
      'action_type', v_action,
      'summary', v_summary,
      'cost', v_cost,
      'xp_awarded', 10
    )
  );

  SELECT to_jsonb(el) INTO v_result
  FROM public.equipment_logs el
  WHERE el.id = v_log_id;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_equipment_maintenance FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_equipment_maintenance TO authenticated;

-- 5. RPC: Bulk Import Inventory CSV (Max 250 items)
CREATE OR REPLACE FUNCTION public.bulk_import_inventory_csv(
  p_items JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_elem JSONB;
  v_count INT := 0;
  v_name TEXT;
  v_type TEXT;
  v_qty NUMERIC;
  v_unit TEXT;
  v_threshold NUMERIC;
  v_price NUMERIC;
  v_curr TEXT;
  v_sku_loc TEXT;
  v_cond TEXT;
  v_keyword TEXT;
  v_reorder TEXT;
  v_folder_name TEXT;
  v_folder_id UUID;
  v_in_cart BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF jsonb_typeof(p_items) != 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array.';
  END IF;

  IF jsonb_array_length(p_items) > 250 THEN
    RAISE EXCEPTION 'Maximum 250 items allowed per CSV import batch.';
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name := TRIM(COALESCE(v_elem->>'name', ''));
    IF v_name = '' THEN
      CONTINUE; -- Skip empty rows
    END IF;

    -- Sanitize item_type
    v_type := UPPER(TRIM(COALESCE(v_elem->>'item_type', 'MATERIAL')));
    IF v_type NOT IN ('MATERIAL', 'EQUIPMENT', 'FINISHED_GOOD') THEN
      v_type := 'MATERIAL';
    END IF;

    -- Numbers & units
    v_qty := GREATEST(0, COALESCE((v_elem->>'quantity')::NUMERIC, 0));
    v_unit := TRIM(COALESCE(v_elem->>'unit', 'pcs'));
    IF v_unit = '' THEN v_unit := 'pcs'; END IF;

    v_threshold := GREATEST(0, COALESCE((v_elem->>'low_stock_threshold')::NUMERIC, 0));
    v_price := GREATEST(0, COALESCE((v_elem->>'unit_price')::NUMERIC, 0));

    -- Currency
    v_curr := UPPER(TRIM(COALESCE(v_elem->>'currency', 'USD')));
    IF v_curr NOT IN ('USD', 'EUR', 'ILS', 'GBP') THEN
      v_curr := 'USD';
    END IF;

    -- Optional strings
    v_sku_loc := TRIM(COALESCE(v_elem->>'sku_or_location', ''));
    
    v_cond := UPPER(TRIM(COALESCE(v_elem->>'condition', 'GOOD')));
    IF v_cond NOT IN ('NEW', 'GOOD', 'FAIR', 'NEEDS_MAINTENANCE', 'REPLACE') THEN
      v_cond := 'GOOD';
    END IF;

    v_keyword := TRIM(COALESCE(v_elem->>'search_keyword', ''));
    v_reorder := TRIM(COALESCE(v_elem->>'reorder_url', ''));

    -- Folder resolution by name (optional)
    v_folder_name := TRIM(COALESCE(v_elem->>'folder_name', ''));
    v_folder_id := NULL;
    IF v_folder_name != '' THEN
      SELECT id INTO v_folder_id
      FROM public.inventory_folders
      WHERE user_id = v_user_id AND name ILIKE v_folder_name
      LIMIT 1;
    END IF;

    -- Auto-flag restock cart for low stock materials
    v_in_cart := (v_type = 'MATERIAL' AND v_threshold > 0 AND v_qty <= v_threshold);

    -- Insert item
    INSERT INTO public.inventory_items (
      user_id,
      folder_id,
      name,
      item_type,
      quantity,
      unit,
      low_stock_threshold,
      unit_price,
      currency,
      sku_or_location,
      condition,
      search_keyword,
      reorder_url,
      in_restock_cart,
      restock_target_qty,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_folder_id,
      v_name,
      v_type,
      v_qty,
      v_unit,
      v_threshold,
      v_price,
      v_curr,
      v_sku_loc,
      v_cond,
      v_keyword,
      v_reorder,
      v_in_cart,
      GREATEST(1, v_threshold * 2),
      now(),
      now()
    );

    v_count := v_count + 1;
  END LOOP;

  -- Activity log
  IF v_count > 0 THEN
    INSERT INTO public.activity_logs (
      user_id,
      event_type,
      metadata
    ) VALUES (
      v_user_id,
      'INVENTORY_CSV_IMPORTED',
      jsonb_build_object('items_count', v_count)
    );
  END IF;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bulk_import_inventory_csv FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bulk_import_inventory_csv TO authenticated;

-- 6. Upgrade export_user_maker_archive to v3.1.0 (includes equipment_logs)
CREATE OR REPLACE FUNCTION public.export_user_maker_archive()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_archive JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to export maker archive.';
  END IF;

  SELECT jsonb_build_object(
    'archive_version', '3.1.0',
    'exported_at', now(),
    'user_id', v_user_id,
    'profile', (
      SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_user_id
    ),
    'user_skills', COALESCE((
      SELECT jsonb_agg(to_jsonb(us))
      FROM public.user_skills us
      WHERE us.user_id = v_user_id
    ), '[]'::jsonb),
    'practice_logs', COALESCE((
      SELECT jsonb_agg(to_jsonb(pl))
      FROM public.practice_logs pl
      WHERE pl.user_id = v_user_id
      ORDER BY pl.practiced_at DESC
    ), '[]'::jsonb),
    'achievements', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'slug', a.slug,
          'title', a.title,
          'tier', a.tier,
          'xp_bonus', a.xp_bonus,
          'unlocked_at', ua.unlocked_at,
          'awarded_by', ua.awarded_by,
          'note', ua.note
        )
      )
      FROM public.user_achievements ua
      JOIN public.achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = v_user_id
      ORDER BY ua.unlocked_at DESC
    ), '[]'::jsonb),
    'projects', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr))
      FROM public.projects pr
      WHERE pr.pm_user_id = v_user_id
      ORDER BY pr.created_at DESC
    ), '[]'::jsonb),
    'project_memberships', COALESCE((
      SELECT jsonb_agg(to_jsonb(pm))
      FROM public.project_members pm
      WHERE pm.user_id = v_user_id
    ), '[]'::jsonb),
    'project_tasks', COALESCE((
      SELECT jsonb_agg(to_jsonb(pt))
      FROM public.project_tasks pt
      WHERE pt.assignee_id = v_user_id
         OR pt.project_id IN (
           SELECT p.id FROM public.projects p WHERE p.pm_user_id = v_user_id
         )
      ORDER BY pt.created_at DESC
    ), '[]'::jsonb),
    'task_comments', COALESCE((
      SELECT jsonb_agg(to_jsonb(tc))
      FROM public.task_comments tc
      WHERE tc.user_id = v_user_id
      ORDER BY tc.created_at DESC
    ), '[]'::jsonb),
    'workspace_notes', COALESCE((
      SELECT jsonb_agg(to_jsonb(wi))
      FROM public.workspace_items wi
      WHERE wi.user_id = v_user_id
      ORDER BY wi.created_at DESC
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
    'equipment_logs', COALESCE((
      SELECT jsonb_agg(to_jsonb(el))
      FROM public.equipment_logs el
      WHERE el.user_id = v_user_id
      ORDER BY el.performed_at DESC
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
