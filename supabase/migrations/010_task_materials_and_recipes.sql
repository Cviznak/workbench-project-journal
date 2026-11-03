-- Migration 010: Task Bill of Materials, Maker Recipes & Auto-Stock Deduction

-- 1. Create public.task_materials
CREATE TABLE IF NOT EXISTS public.task_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_required NUMERIC(10, 2) NOT NULL CHECK (quantity_required > 0),
  deducted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_task_material UNIQUE (task_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_task_materials_task ON public.task_materials(task_id);
CREATE INDEX IF NOT EXISTS idx_task_materials_project ON public.task_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_task_materials_item ON public.task_materials(inventory_item_id);

ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view task materials"
ON public.task_materials FOR SELECT TO authenticated
USING (public.is_project_member(project_id) OR public.is_admin());

CREATE POLICY "Project members can add task materials"
ON public.task_materials FOR INSERT TO authenticated
WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Project members can update task materials"
ON public.task_materials FOR UPDATE TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Project members can delete task materials"
ON public.task_materials FOR DELETE TO authenticated
USING (public.is_project_member(project_id));

-- 2. Create public.maker_recipes & public.recipe_ingredients
CREATE TABLE IF NOT EXISTS public.maker_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  category TEXT DEFAULT 'General',
  instructions_md TEXT DEFAULT '',
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maker_recipes_user ON public.maker_recipes(user_id);

ALTER TABLE public.maker_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recipes"
ON public.maker_recipes FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.maker_recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_required NUMERIC(10, 2) NOT NULL CHECK (quantity_required > 0),
  CONSTRAINT uq_recipe_ingredient UNIQUE (recipe_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_item ON public.recipe_ingredients(inventory_item_id);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe ingredients"
ON public.recipe_ingredients FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maker_recipes mr
    WHERE mr.id = recipe_id AND mr.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can insert own recipe ingredients"
ON public.recipe_ingredients FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maker_recipes mr
    WHERE mr.id = recipe_id AND mr.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can update own recipe ingredients"
ON public.recipe_ingredients FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maker_recipes mr
    WHERE mr.id = recipe_id AND mr.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maker_recipes mr
    WHERE mr.id = recipe_id AND mr.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can delete own recipe ingredients"
ON public.recipe_ingredients FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maker_recipes mr
    WHERE mr.id = recipe_id AND mr.user_id = (SELECT auth.uid())
  )
);

-- 3. Enable Realtime on new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_materials'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_materials;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'maker_recipes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maker_recipes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'recipe_ingredients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_ingredients;
  END IF;
END $$;

-- 4. Update complete_project_task RPC with Auto-Deduct Stock
CREATE OR REPLACE FUNCTION public.complete_project_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Auto-assign to caller if unassigned
  v_assignee_id := COALESCE(v_task.assignee_id, v_caller_id);
  v_xp_reward := v_task.xp_reward;

  -- Determine skill
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
  IF v_task.xp_awarded = false THEN
    -- Set transaction config so guard trigger permits setting xp_awarded = true
    PERFORM set_config('workbench.granting_xp', '1', true);

    UPDATE public.project_tasks
    SET xp_awarded = true
    WHERE id = p_task_id;

    -- Award XP to assignee
    INSERT INTO public.user_skills (user_id, skill_id, total_xp, level, last_practiced_at)
    VALUES (v_assignee_id, v_skill_id, v_xp_reward, public.calculate_skill_level(v_xp_reward), now())
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      total_xp = user_skills.total_xp + v_xp_reward,
      level = public.calculate_skill_level(user_skills.total_xp + v_xp_reward),
      last_practiced_at = now();

    -- Log activity
    INSERT INTO public.activity_logs (user_id, project_id, event_type, summary, xp_delta, metadata)
    VALUES (
      v_assignee_id,
      v_task.project_id,
      'TASK_COMPLETED',
      'Completed task: "' || v_task.title || '" (+' || v_xp_reward || ' XP)',
      v_xp_reward,
      jsonb_build_object(
        'task_id', p_task_id,
        'task_title', v_task.title,
        'project_name', v_proj.name,
        'materials_deducted', v_materials_deducted
      )
    );

    -- Touch consistency streak for assignee
    PERFORM public.touch_user_streak(v_assignee_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'xp_awarded', v_xp_reward,
    'assignee_id', v_assignee_id,
    'materials_deducted', v_materials_deducted
  );
END;
$func$;

-- 5. RPC execute_maker_recipe
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
    SELECT ri.inventory_item_id, ri.quantity_required
    FROM public.recipe_ingredients ri
    WHERE ri.recipe_id = p_recipe_id
  LOOP
    v_needed := v_ing.quantity_required * p_batch_multiplier;

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

  -- Log recipe execution
  INSERT INTO public.activity_logs (user_id, event_type, summary, xp_delta, metadata)
  VALUES (
    v_user_id,
    'RECIPE_EXECUTED',
    'Executed recipe "' || v_recipe.title || '" (' || p_batch_multiplier || 'x batch)',
    0,
    jsonb_build_object(
      'recipe_id', p_recipe_id,
      'recipe_title', v_recipe.title,
      'multiplier', p_batch_multiplier,
      'ingredients_deducted', v_deducted_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'recipe_id', p_recipe_id,
    'multiplier', p_batch_multiplier,
    'ingredients_deducted', v_deducted_count
  );
END;
$$;

-- 6. Update export_user_maker_archive to include task materials & recipes
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
    'version', '1.5.0',
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
