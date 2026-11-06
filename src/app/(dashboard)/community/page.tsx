import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CommunityFeedClient from '@/components/CommunityFeedClient';

export const metadata = {
  title: 'Maker Community Social Feed | Workbench',
  description:
    'Explore live project updates, workshop formulas, and creations from makers and engineers.',
  openGraph: {
    title: 'Maker Community Social Feed | Workbench',
    description:
      'Explore live project updates, workshop formulas, and creations from makers and engineers.',
    url: 'https://www.workbenchsoc.com/community',
  },
};

export default async function CommunityPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch initial posts, skills, and marketplace feed (available to both authenticated and anon)
  const [
    { data: posts },
    { data: allSkills },
    marketplaceRes,
    userProjectsRes,
    currentProfileRes,
  ] = await Promise.all([
    supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_author_id_fkey(*),
        skill:skill_catalog(*),
        project:projects(id, name, status, is_public),
        likes:post_likes(user_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('skill_catalog')
      .select('*')
      .order('name'),
    supabase.rpc('get_public_marketplace_feed', { p_limit: 40 }),
    user
      ? supabase
          .from('projects')
          .select('id, name, is_public, status')
          .eq('pm_user_id', user.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      {!user && (
        <header className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/30">
              W
            </span>
            <span className="font-black text-slate-900 dark:text-white tracking-tight">Workbench</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/tools"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Calculators
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              Join Free
            </Link>
          </div>
        </header>
      )}

      <CommunityFeedClient
        initialPosts={posts || []}
        allSkills={allSkills || []}
        userProjects={(userProjectsRes?.data as any) || []}
        currentUserId={user?.id || ''}
        currentProfile={currentProfileRes?.data || null}
        initialMarketplaceData={
          (marketplaceRes?.data as any) || { public_recipes: [], public_projects: [] }
        }
      />
    </div>
  );
}
