import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import KanbanBoardClient from '@/components/KanbanBoardClient';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const projectId = params.id;

  // 1. Fetch project with PM profile
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('*, pm:profiles!projects_pm_user_id_fkey(*)')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    notFound();
  }

  // 2. Fetch project members
  const { data: members } = await supabase
    .from('project_members')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId);

  // 3. Fetch project skills
  const { data: skills } = await supabase
    .from('project_skills')
    .select('*, skill:skill_catalog(*)')
    .eq('project_id', projectId);

  // 4. Fetch project tasks
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select('*, assignee:profiles(*), skill:skill_catalog(*)')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  // 5. Fetch all catalog skills for task tagging
  const { data: allSkills } = await supabase
    .from('skill_catalog')
    .select('*')
    .order('name');

  return (
    <KanbanBoardClient
      project={project}
      members={members || []}
      skills={skills || []}
      tasks={tasks || []}
      allSkills={allSkills || []}
      userId={user.id}
    />
  );
}
