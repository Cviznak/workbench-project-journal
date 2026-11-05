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

  // 2. Fetch project members, skills, tasks, catalog skills, and community posts concurrently
  const [
    { data: members },
    { data: skills },
    { data: tasks },
    { data: allSkills },
    { data: projectPosts },
  ] = await Promise.all([
    supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', projectId),
    supabase
      .from('project_skills')
      .select('*, skill:skill_catalog(*)')
      .eq('project_id', projectId),
    supabase
      .from('project_tasks')
      .select('*, assignee:profiles!project_tasks_assignee_id_fkey(*), skill:skill_catalog(*), comments:task_comments(count), attachments:task_attachments(count), task_materials(*, inventory_item:inventory_items(*))')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('skill_catalog')
      .select('*')
      .order('name'),
    supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_author_id_fkey(*),
        skill:skill_catalog(*),
        likes:post_likes(user_id)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ]);

  // Guarantee PM is always present in members with ACCEPTED status
  const safeMembers = [...(members || [])];
  if (project.pm && !safeMembers.some((m) => m.user_id === project.pm_user_id)) {
    safeMembers.unshift({
      project_id: projectId,
      user_id: project.pm_user_id,
      invitation_status: 'ACCEPTED',
      joined_at: project.created_at,
      profile: project.pm,
    });
  }

  const isMember =
    project.pm_user_id === user.id ||
    safeMembers.some((m) => m.user_id === user.id && m.invitation_status === 'ACCEPTED');

  const isPublicShowcase = !isMember && Boolean(project.is_public);

  return (
    <KanbanBoardClient
      project={project}
      members={safeMembers}
      skills={skills || []}
      tasks={tasks || []}
      allSkills={allSkills || []}
      userId={user.id}
      isPublicShowcase={isPublicShowcase}
      projectPosts={projectPosts || []}
    />
  );
}
