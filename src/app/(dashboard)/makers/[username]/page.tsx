import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MakerProfileClient from '@/components/MakerProfileClient';

interface MakerProfilePageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: MakerProfilePageProps) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, bio')
    .eq('username', params.username)
    .single();

  if (!profile) {
    return { title: 'Maker Not Found | Workbench' };
  }

  return {
    title: `${profile.display_name} (@${profile.username}) | Workbench Maker Profile`,
    description: profile.bio || `Explore ${profile.display_name}'s workshop projects, leveled skills, and creations.`,
  };
}

export default async function MakerProfilePage({ params }: MakerProfilePageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = decodeURIComponent(params.username);

  // 1. Fetch target maker profile
  const { data: targetProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (profileErr || !targetProfile) {
    notFound();
  }

  const isOwnProfile = user ? user.id === targetProfile.id : false;

  // 2. Fetch maker's community posts, projects, skills, and catalog
  let projectsQuery = supabase
    .from('projects')
    .select(`
      *,
      skills:project_skills(skill:skill_catalog(*)),
      tasks:project_tasks(id, status)
    `)
    .eq('pm_user_id', targetProfile.id);

  if (!isOwnProfile) {
    projectsQuery = projectsQuery.eq('is_public', true);
  }

  const [
    { data: posts },
    { data: projects },
    { data: userSkills },
    { data: allSkills },
    { data: currentUserProfile },
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
      .eq('author_id', targetProfile.id)
      .order('created_at', { ascending: false }),
    projectsQuery.order('created_at', { ascending: false }),
    supabase
      .from('user_skills')
      .select('*, skill:skill_catalog(*)')
      .eq('user_id', targetProfile.id)
      .order('total_xp', { ascending: false }),
    supabase
      .from('skill_catalog')
      .select('*')
      .order('name'),
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
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-white text-sm">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black">
              W
            </div>
            <span>Workbench</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition"
            >
              Start Free Workshop
            </Link>
          </div>
        </div>
      )}
      <MakerProfileClient
        targetProfile={targetProfile}
        isOwnProfile={isOwnProfile}
        initialPosts={posts || []}
        initialProjects={projects || []}
        userSkills={userSkills || []}
        allSkills={allSkills || []}
        currentUserId={user?.id || ''}
        currentUserProfile={currentUserProfile}
      />
    </div>
  );
}
