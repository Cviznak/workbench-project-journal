import { createClient } from '@/lib/supabase/server';
import ProjectsListClient from '@/components/ProjectsListClient';

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch project IDs where user is an active or invited member
  const { data: memberRows } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);

  const memberProjectIds = (memberRows || []).map((r) => r.project_id);

  // 2. Fetch projects where user is PM OR an explicit member
  // (Strict Project Tab Isolation: prevents public showcase projects by other makers from cluttering personal /projects board)
  let projectQuery = supabase
    .from('projects')
    .select('*, pm:profiles!projects_pm_user_id_fkey(*), members:project_members(user_id, invitation_status, profile:profiles(*)), skills:project_skills(skill:skill_catalog(*))')
    .order('created_at', { ascending: false });

  if (memberProjectIds.length > 0) {
    projectQuery = projectQuery.or(`pm_user_id.eq.${user.id},id.in.(${memberProjectIds.join(',')})`);
  } else {
    projectQuery = projectQuery.eq('pm_user_id', user.id);
  }

  // Fetch isolated personal projects and global catalog skills concurrently
  const [{ data: projects }, { data: skills }] = await Promise.all([
    projectQuery,
    supabase
      .from('skill_catalog')
      .select('*')
      .order('name'),
  ]);

  return (
    <ProjectsListClient
      initialProjects={projects || []}
      catalogSkills={skills || []}
      userId={user.id}
    />
  );
}
