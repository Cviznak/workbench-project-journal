import { createClient } from '@/lib/supabase/server';
import ProjectsListClient from '@/components/ProjectsListClient';

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch projects user is member of or PM, and global catalog skills concurrently
  const [{ data: projects }, { data: skills }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, pm:profiles!projects_pm_user_id_fkey(*), members:project_members(user_id, invitation_status, profile:profiles(*)), skills:project_skills(skill:skill_catalog(*))')
      .order('created_at', { ascending: false }),
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
