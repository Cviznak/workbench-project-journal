'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Project, ProjectTask, TaskStatus, TaskPriority, Profile, SkillCatalog } from '@/lib/types';
import {
  FolderKanban,
  CheckCircle,
  Plus,
  Users,
  Trophy,
  UserPlus,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  Clock,
} from 'lucide-react';

interface KanbanBoardClientProps {
  project: any;
  members: any[];
  skills: any[];
  tasks: any[];
  allSkills: SkillCatalog[];
  userId: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'To Do', color: 'bg-slate-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'REVIEW', label: 'Review', color: 'bg-purple-500' },
  { id: 'DONE', label: 'Done (Claimed)', color: 'bg-emerald-500' },
];

export default function KanbanBoardClient({
  project,
  members,
  skills,
  tasks: initialTasks,
  allSkills,
  userId,
}: KanbanBoardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskAssignee, setTaskAssignee] = useState<string>('');
  const [taskSkill, setTaskSkill] = useState<string>('');
  const [taskXp, setTaskXp] = useState('25');
  const [taskLoading, setTaskLoading] = useState(false);

  // Member invite state
  const [inviteUsername, setInviteUsername] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // PM Transfer state
  const [newPmId, setNewPmId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Project completion state
  const [completingProj, setCompletingProj] = useState(false);

  const isPM = project.pm_user_id === userId;
  const projectSkills = skills.map((s) => s.skill).filter(Boolean);
  const projectMembers = members.map((m) => m.profile).filter(Boolean);

  // 1. Move Task status / Complete task
  async function handleMoveTask(taskId: string, targetStatus: TaskStatus) {
    if (targetStatus === 'DONE') {
      // Execute Payout 1 RPC: Individual Task Completion XP
      try {
        const { data, error } = await supabase.rpc('complete_project_task', {
          p_task_id: taskId,
        });

        if (error) throw error;

        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'DONE', xp_awarded: true } : t))
        );
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Failed to complete task');
      }
    } else {
      // Normal status transition
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
      );

      const { error } = await supabase
        .from('project_tasks')
        .update({ status: targetStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) {
        alert(error.message);
        router.refresh();
      }
    }
  }

  // 2. Add New Task
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskLoading(true);

    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: project.id,
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          priority: taskPriority,
          assignee_id: taskAssignee || null,
          skill_id: taskSkill || null,
          xp_reward: parseInt(taskXp, 10) || 25,
          status: 'TODO',
        })
        .select('*, assignee:profiles(*), skill:skill_catalog(*)')
        .single();

      if (error) throw error;

      if (data) {
        setTasks((prev) => [...prev, data]);
        setTaskModalOpen(false);
        setTaskTitle('');
        setTaskDesc('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add task');
    } finally {
      setTaskLoading(false);
    }
  }

  // 3. Add Project Member
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberLoading(true);
    setMemberError(null);

    try {
      const cleanU = inviteUsername.toLowerCase().trim();
      const { data: targetProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', cleanU)
        .single();

      if (profileErr || !targetProfile) {
        throw new Error(`User @${cleanU} not found`);
      }

      const { error: memberErr } = await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: targetProfile.id,
      });

      if (memberErr) throw memberErr;

      setMemberModalOpen(false);
      setInviteUsername('');
      router.refresh();
    } catch (err: any) {
      setMemberError(err.message || 'Failed to add member');
    } finally {
      setMemberLoading(false);
    }
  }

  // 4. Transfer PM Role
  async function handleTransferPM(e: React.FormEvent) {
    e.preventDefault();
    if (!newPmId) return;
    setTransferLoading(true);

    try {
      const { error } = await supabase.rpc('transfer_project_pm', {
        p_project_id: project.id,
        p_new_pm_user_id: newPmId,
      });

      if (error) throw error;

      setTransferModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to transfer PM role');
    } finally {
      setTransferLoading(false);
    }
  }

  // 5. Complete Project (Payout 2: Team-Wide XP Engine)
  async function handleCompleteProject() {
    if (!confirm('Mark this project as COMPLETED? This will payout completion XP to all project members for each linked skill!')) {
      return;
    }

    setCompletingProj(true);
    try {
      const { data, error } = await supabase.rpc('complete_project', {
        p_project_id: project.id,
      });

      if (error) throw error;

      alert(`🏆 Project Completed! Distributed +${project.completion_xp_reward} XP to team members across all project skills!`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete project');
    } finally {
      setCompletingProj(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Project Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Link
                href="/projects"
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ← Back to Projects
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  project.status === 'COMPLETED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                }`}
              >
                {project.status}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
                <Trophy className="w-3.5 h-3.5" />
                <span>+{project.completion_xp_reward} Team XP</span>
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>＋ Add Task</span>
            </button>

            {isPM && (
              <>
                <button
                  onClick={() => setMemberModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </button>

                <button
                  onClick={() => setTransferModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Transfer Project Manager ownership"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Transfer PM</span>
                </button>

                {project.status !== 'COMPLETED' && (
                  <button
                    onClick={handleCompleteProject}
                    disabled={completingProj}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {completingProj ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5" />
                    )}
                    <span>Complete Project &amp; Award XP</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Project Meta: PM, Members, Developing Skills */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Project Manager
            </span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                {project.pm?.display_name?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  {project.pm?.display_name}
                </span>
                <span className="text-[11px] text-slate-400">@{project.pm?.username}</span>
              </div>
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Team Members ({projectMembers.length})
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {projectMembers.map((m: any) => (
                <span
                  key={m.id}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]"
                  title={`@${m.username}`}
                >
                  {m.display_name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Developing Skills (Payout XP)
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {projectSkills.length > 0 ? (
                projectSkills.map((s: any) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-semibold text-[11px]"
                  >
                    {s.name}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">No skills linked</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Jira-Style Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {col.label}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards Column Body */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {colTasks.map((task) => {
                  const priorityColors = {
                    LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                    MEDIUM: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
                    HIGH: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
                    CRITICAL: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
                  }[task.priority as TaskPriority];

                  return (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${priorityColors}`}>
                          {task.priority}
                        </span>

                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                          +{task.xp_reward} XP
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {task.skill && (
                        <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          🎯 {task.skill.name}
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {task.assignee ? (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              @{task.assignee.username}
                            </span>
                          ) : (
                            <span className="italic">Unassigned</span>
                          )}
                        </span>

                        {/* Status Transition buttons */}
                        <div className="flex items-center gap-1">
                          {col.id === 'TODO' && (
                            <button
                              onClick={() => handleMoveTask(task.id, 'IN_PROGRESS')}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-[11px] font-bold text-blue-600"
                              title="Start working"
                            >
                              Start →
                            </button>
                          )}
                          {col.id === 'IN_PROGRESS' && (
                            <>
                              <button
                                onClick={() => handleMoveTask(task.id, 'TODO')}
                                className="px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px]"
                                title="Move back to Todo"
                              >
                                ←
                              </button>
                              <button
                                onClick={() => handleMoveTask(task.id, 'REVIEW')}
                                className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950 text-[11px] font-bold text-purple-600"
                                title="Send for review"
                              >
                                Review →
                              </button>
                            </>
                          )}
                          {col.id === 'REVIEW' && (
                            <>
                              <button
                                onClick={() => handleMoveTask(task.id, 'IN_PROGRESS')}
                                className="px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px]"
                                title="Needs rework"
                              >
                                ←
                              </button>
                              <button
                                onClick={() => handleMoveTask(task.id, 'DONE')}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] shadow-sm hover:bg-emerald-700"
                                title="Complete task & claim individual XP"
                              >
                                ✓ Done
                              </button>
                            </>
                          )}
                          {col.id === 'DONE' && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{task.xp_awarded ? 'XP Awarded' : 'Done'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-12">
                    No tasks in {col.label.toLowerCase()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setTaskModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Add Jira Task
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Solder motor ESC connections, Tune slicing infill"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Description / Acceptance Criteria
                </label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Steps required to consider this task DONE..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Individual XP Reward
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={taskXp}
                    onChange={(e) => setTaskXp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="">— Unassigned —</option>
                    {projectMembers.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} (@{m.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Developed Skill
                  </label>
                  <select
                    value={taskSkill}
                    onChange={(e) => setTaskSkill(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="">— Inherit Project Skills —</option>
                    {allSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {taskLoading ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Invite Modal */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setMemberModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Invite Team Member
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter their exact username to add them to this project.
            </p>

            {memberError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs">
                {memberError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="alex_maker"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={memberLoading}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {memberLoading ? 'Inviting...' : 'Add Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transfer PM Role Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setTransferModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Transfer PM Leadership
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select another project member to assume the Project Manager role.
            </p>

            <form onSubmit={handleTransferPM} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  New Project Manager
                </label>
                <select
                  required
                  value={newPmId}
                  onChange={(e) => setNewPmId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
                >
                  <option value="">— Select Member —</option>
                  {projectMembers
                    .filter((m: any) => m.id !== userId)
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} (@{m.username})
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={transferLoading || !newPmId}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {transferLoading ? 'Transferring...' : 'Confirm PM Transfer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
