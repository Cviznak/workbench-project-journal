import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminHubClient from '@/components/AdminHubClient';
import { Profile } from '@/lib/types';

export default async function AdminHubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role !== 'ROOT_ADMIN' && callerProfile?.role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch profiles, audit logs, skill requests, user feedback, skill catalog, posts, showcase projects, and telemetry concurrently
  const [
    { data: profiles },
    { data: auditLogs },
    { data: skillRequests },
    { data: userFeedback },
    { data: skillsData },
    { data: postsData },
    { data: showcaseData },
    { data: telemetryData },
    { data: achievementsData },
    { data: catalogSkillsData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('skill_requests')
      .select('*, user:profiles!skill_requests_user_id_fkey(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_feedback')
      .select('*, user:profiles!user_feedback_user_id_fkey(*)')
      .order('created_at', { ascending: false }),
    supabase
      .rpc('get_skill_catalog_with_usage'),
    supabase
      .from('community_posts')
      .select('*, author:profiles!community_posts_author_id_fkey(*), skill:skill_catalog(*)')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('projects')
      .select('*, pm:profiles!projects_pm_user_id_fkey(*)')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(25),
    supabase
      .rpc('get_admin_platform_telemetry'),
    supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('skill_catalog')
      .select('id, name, slug, category')
      .order('name'),
  ]);

  return (
    <AdminHubClient
      caller={callerProfile as Profile}
      initialProfiles={(profiles as Profile[]) || []}
      auditLogs={auditLogs || []}
      initialSkillRequests={(skillRequests as any[]) || []}
      initialFeedback={(userFeedback as any[]) || []}
      initialSkills={(skillsData as any[]) || []}
      initialCommunityPosts={(postsData as any[]) || []}
      initialShowcaseProjects={(showcaseData as any[]) || []}
      telemetry={telemetryData || null}
      allAchievements={(achievementsData as any[]) || []}
      catalogSkills={(catalogSkillsData as any[]) || []}
    />
  );
}
