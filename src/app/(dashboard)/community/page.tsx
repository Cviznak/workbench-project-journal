import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CommunityFeedClient from '@/components/CommunityFeedClient';

export const metadata = {
  title: 'Community Feed | Workbench',
  description: 'Share your maker creations, workshop formulas, and connect with fellow makers.',
};

export default async function CommunityPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch initial posts, skills, and user's projects concurrently
  const [
    { data: posts },
    { data: allSkills },
    { data: userProjects },
    { data: currentProfile },
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
    supabase
      .from('projects')
      .select('id, name, is_public, status')
      .eq('pm_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
  ]);

  return (
    <CommunityFeedClient
      initialPosts={posts || []}
      allSkills={allSkills || []}
      userProjects={userProjects || []}
      currentUserId={user.id}
      currentProfile={currentProfile}
    />
  );
}
