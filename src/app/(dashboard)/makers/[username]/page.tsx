import { notFound, redirect } from 'next/navigation';
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

  if (!user) redirect('/login');

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

  const isOwnProfile = user.id === targetProfile.id;

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
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
  ]);

  return (
    <MakerProfileClient
      targetProfile={targetProfile}
      isOwnProfile={isOwnProfile}
      initialPosts={posts || []}
      initialProjects={projects || []}
      userSkills={userSkills || []}
      allSkills={allSkills || []}
      currentUserId={user.id}
      currentUserProfile={currentUserProfile}
    />
  );
}
