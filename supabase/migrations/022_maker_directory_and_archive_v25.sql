-- Migration 022: Maker Directory Leaderboard & Archive v2.5.0
-- Version: 2.5.0
-- Rules: 100% pure LF, never mention the forbidden word, never bypass RLS, preserve sticky headers

-- ----------------------------------------------------------------------------
-- 1. RPC public.get_makers_leaderboard(p_limit INT DEFAULT 50)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_makers_leaderboard(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT,
  current_streak INT,
  longest_streak INT,
  total_xp BIGINT,
  skills_count BIGINT,
  public_projects_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.role::TEXT AS role,
    p.current_streak,
    p.longest_streak,
    COALESCE(SUM(us.total_xp), 0)::BIGINT AS total_xp,
    COUNT(DISTINCT us.skill_id)::BIGINT AS skills_count,
    COUNT(DISTINCT pr.id)::BIGINT AS public_projects_count,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_skills us ON us.user_id = p.id
  LEFT JOIN public.projects pr ON pr.pm_user_id = p.id AND pr.is_public = true
  WHERE p.is_suspended = false
  GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.bio, p.role, p.current_streak, p.longest_streak, p.created_at
  ORDER BY total_xp DESC, p.current_streak DESC, p.created_at ASC
  LIMIT LEAST(COALESCE(p_limit, 50), 100);
END;
$$;

-- Grant execution to anon and authenticated for public maker discovery
GRANT EXECUTE ON FUNCTION public.get_makers_leaderboard(INT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Upgrade public.export_user_maker_archive() to v2.5.0
-- ----------------------------------------------------------------------------
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
    'version', '2.5.0',
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

-- Secure execution privileges
REVOKE EXECUTE ON FUNCTION public.export_user_maker_archive() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.export_user_maker_archive() TO authenticated;
