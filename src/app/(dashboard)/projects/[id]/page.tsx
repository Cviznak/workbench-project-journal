import Link from 'next/link';
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

  // If visitor is unauthenticated and project is not public, redirect to login
  if (!user && !project.is_public) {
    redirect('/login');
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

  const isMember = user
    ? project.pm_user_id === user.id ||
      safeMembers.some((m) => m.user_id === user.id && m.invitation_status === 'ACCEPTED')
    : false;

  const isPublicShowcase = !isMember && Boolean(project.is_public);

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
      <KanbanBoardClient
        project={project}
        members={safeMembers}
        skills={skills || []}
        tasks={tasks || []}
        allSkills={allSkills || []}
        userId={user?.id || ''}
        isPublicShowcase={isPublicShowcase}
        projectPosts={projectPosts || []}
      />
    </div>
  );
}
