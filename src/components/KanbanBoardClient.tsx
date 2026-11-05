'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Project,
  ProjectTask,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  SkillCatalog,
  TaskSubtask,
} from '@/lib/types';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import { formatCurrency } from '@/lib/utils';
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
  Search,
  Filter,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Settings,
  MoreVertical,
  MessageSquare,
  Paperclip,
  Lock,
  Boxes,
} from 'lucide-react';
import EditTaskModal from '@/components/EditTaskModal';
import EditProjectModal from '@/components/EditProjectModal';

interface KanbanBoardClientProps {
  project: any;
  members: any[];
  skills: any[];
  tasks: any[];
  allSkills: SkillCatalog[];
  userId: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; accentBorder: string }[] = [
  { id: 'TODO', label: 'To Do', color: 'bg-slate-500', accentBorder: 'border-slate-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500', accentBorder: 'border-blue-400' },
  { id: 'REVIEW', label: 'Review', color: 'bg-purple-500', accentBorder: 'border-purple-400' },
  { id: 'DONE', label: 'Done (Claimed)', color: 'bg-emerald-500', accentBorder: 'border-emerald-400' },
];

export default function KanbanBoardClient({
  project: initialProject,
  members: initialMembers,
  skills: initialSkills,
  tasks: initialTasks,
  allSkills,
  userId,
}: KanbanBoardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<any>(initialProject);
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [projectSkillsList, setProjectSkillsList] = useState<any[]>(initialSkills);
  const [membersList, setMembersList] = useState<any[]>(initialMembers);

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState<'team' | 'settings'>('team');
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Quick Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<'ALL' | string>('ALL');
  const [activeSubtaskInput, setActiveSubtaskInput] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskAssignee, setTaskAssignee] = useState<string>('');
  const [taskSkill, setTaskSkill] = useState<string>('');
  const [taskPrereq, setTaskPrereq] = useState<string>('');
  const [taskXp, setTaskXp] = useState('25');
  const [taskLoading, setTaskLoading] = useState(false);

  // PM Transfer state
  const [newPmId, setNewPmId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Project completion state
  const [completingProj, setCompletingProj] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const isPM = project.pm_user_id === userId;
  const myMembership = membersList.find((m: any) => m.user_id === userId);
  const isPendingInvite = !isPM && myMembership?.invitation_status === 'PENDING';
  const projectSkills = projectSkillsList.map((s) => s.skill).filter(Boolean);

  // Guarantee PM is always present in projectMembers with ACCEPTED status
  const rawMemberProfiles = membersList
    .map((m) =>
      m.profile
        ? {
            ...m.profile,
            invitation_status:
              m.user_id === project.pm_user_id ? 'ACCEPTED' : (m.invitation_status || 'ACCEPTED'),
          }
        : null
    )
    .filter(Boolean);

  const hasPmInMembers = rawMemberProfiles.some((m) => m.id === project.pm_user_id);
  const projectMembers = hasPmInMembers
    ? rawMemberProfiles
    : project.pm
    ? [{ ...project.pm, invitation_status: 'ACCEPTED' }, ...rawMemberProfiles]
    : rawMemberProfiles;

  // -------------------------------------------------------------
  // Realtime WebSocket Subscription
  // -------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`project-tasks-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${project.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('project_tasks')
              .select('*, assignee:profiles(*), skill:skill_catalog(*)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setTasks((prev) => {
                if (prev.some((t) => t.id === data.id)) return prev;
                return [...prev, data];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id === payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.id, supabase]);

  // -------------------------------------------------------------
  // Open Task Workshop Drawer / Modal
  // -------------------------------------------------------------
  function openEditTask(task: any) {
    setEditingTask(task);
    setEditTaskModalOpen(true);
  }

  // -------------------------------------------------------------
  // Task Status Transition / Payout Execution
  // -------------------------------------------------------------
  async function handleMoveTask(taskId: string, targetStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    if (targetStatus === 'DONE') {
      // Check prerequisite task status client-side before invoking RPC
      if (task.prerequisite_task_id) {
        const prereq = tasks.find((t) => t.id === task.prerequisite_task_id);
        if (prereq && prereq.status !== 'DONE') {
          alert(`Cannot complete task: prerequisite task "${prereq.title}" must be completed first.`);
          return;
        }
      }

      try {
        const { error } = await supabase.rpc('complete_project_task', {
          p_task_id: taskId,
        });

        if (error) throw error;

        sounds.playTaskComplete();
        triggerCelebrationConfetti();

        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'DONE', xp_awarded: true } : t))
        );
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Failed to complete task');
      }
    } else {
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

  // -------------------------------------------------------------
  // Subtasks & Checklists Management
  // -------------------------------------------------------------
  async function handleToggleSubtask(taskId: string, subtaskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    sounds.playSubtaskCheck();

    const currentSubtasks: TaskSubtask[] = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t))
    );

    await supabase
      .from('project_tasks')
      .update({ subtasks: updatedSubtasks, updated_at: new Date().toISOString() })
      .eq('id', taskId);
  }

  async function handleAddSubtask(taskId: string) {
    if (!newSubtaskTitle.trim()) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newSubtask: TaskSubtask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t))
    );
    setNewSubtaskTitle('');
    setActiveSubtaskInput(null);

    await supabase
      .from('project_tasks')
      .update({ subtasks: updatedSubtasks, updated_at: new Date().toISOString() })
      .eq('id', taskId);
  }

  // -------------------------------------------------------------
  // Drag and Drop Event Handlers
  // -------------------------------------------------------------
  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  }

  function handleDragOver(e: React.DragEvent, colId: TaskStatus) {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  }

  function handleDrop(e: React.DragEvent, colId: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      handleMoveTask(taskId, colId);
    }
    setDraggedTaskId(null);
    setDragOverCol(null);
  }

  // -------------------------------------------------------------
  // Add New Task
  // -------------------------------------------------------------
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
          prerequisite_task_id: taskPrereq || null,
          xp_reward: parseInt(taskXp, 10) || 25,
          subtasks: [],
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
        setTaskPrereq('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add task');
    } finally {
      setTaskLoading(false);
    }
  }


  // Transfer PM Role
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

  // Complete Project (Team-Wide XP Engine)
  async function handleCompleteProject() {
    if (
      !confirm(
        'Mark this project as COMPLETED? This will payout completion XP to all project members for each linked skill!'
      )
    ) {
      return;
    }

    setCompletingProj(true);
    try {
      const { error } = await supabase.rpc('complete_project', {
        p_project_id: project.id,
      });

      if (error) throw error;

      sounds.playLevelUp();
      triggerCelebrationConfetti();

      alert(
        `🏆 Project Completed! Distributed +${project.completion_xp_reward} XP to team members across all project skills!`
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete project');
    } finally {
      setCompletingProj(false);
    }
  }

  // Filter tasks based on Search, Priority, and Assignee
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesAssignee =
      assigneeFilter === 'ALL' ||
      (assigneeFilter === 'UNASSIGNED' ? !t.assignee_id : t.assignee_id === assigneeFilter);

    return matchesSearch && matchesPriority && matchesAssignee;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 min-w-0 max-w-full overflow-x-hidden">
      {/* Project Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
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

              {/* Realtime Live Sync indicator */}
              <span
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  isRealtimeActive
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRealtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{isRealtimeActive ? 'Live Synced' : 'Syncing'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>

            {isPM ? (
              <>
                <button
                  onClick={() => {
                    setProjectModalTab('settings');
                    setProjectModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Edit Project settings & skills"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Edit Project</span>
                </button>

                <button
                  onClick={() => {
                    setProjectModalTab('team');
                    setProjectModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Search & invite teammates, view roster"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Team ({membersList.length})</span>
                </button>

                <button
                  onClick={() => setTransferModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Transfer Project Manager ownership"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Transfer PM</span>
                </button>

                {project.status !== 'COMPLETED' && (
                  <button
                    onClick={handleCompleteProject}
                    disabled={completingProj}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 disabled:opacity-50 transition"
                  >
                    {completingProj ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5" />
                    )}
                    <span>Complete &amp; Award XP</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  setProjectModalTab('team');
                  setProjectModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="View team roster or leave project"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team ({membersList.length})</span>
              </button>
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
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] inline-flex items-center gap-1.5"
                  title={`@${m.username}${m.invitation_status === 'PENDING' ? ' (Invitation Pending)' : ''}`}
                >
                  <span>{m.display_name}</span>
                  {m.invitation_status === 'PENDING' && (
                    <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/30">
                      Invited
                    </span>
                  )}
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

      {/* Pending Invitation Banner */}
      {isPendingInvite && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
              📬
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                You have a pending invitation to this project
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Accept this invitation to join the team, collaborate on tasks, and earn completion XP.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <button
              onClick={async () => {
                const { error } = await supabase.rpc('accept_project_invite', { p_project_id: project.id });
                if (error) alert(error.message);
                else {
                  sounds.playTaskComplete();
                  triggerCelebrationConfetti();
                  router.refresh();
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              Accept Invitation
            </button>
            <button
              onClick={async () => {
                const { error } = await supabase.rpc('decline_project_invite', { p_project_id: project.id });
                if (error) alert(error.message);
                else {
                  router.push('/projects');
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Quick Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search board tasks..."
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 min-w-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none"
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {projectMembers.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
            Showing {filteredTasks.length} of {tasks.length}
          </span>
        </div>
      </div>

      {/* Interactive Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 min-w-0">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          const isDropTarget = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`bg-slate-100/70 dark:bg-slate-900/60 border rounded-3xl p-4 flex flex-col min-h-[450px] transition-all min-w-0 ${
                isDropTarget
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{col.label}</h3>
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

                  const subtasks: TaskSubtask[] = task.subtasks || [];
                  const completedSubtasks = subtasks.filter((s) => s.completed).length;
                  const hasSubtasks = subtasks.length > 0;
                  const isDraggingThis = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 min-w-0 ${
                        isDraggingThis ? 'opacity-40 scale-95 border-dashed border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${priorityColors}`}
                        >
                          {task.priority}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            +{task.xp_reward} XP
                          </span>
                          <button
                            onClick={() => openEditTask(task)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4
                        onClick={() => openEditTask(task)}
                        className="font-bold text-sm text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
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

                      {/* Prerequisite Dependency Badge */}
                      {task.prerequisite_task_id && (() => {
                        const prereq = tasks.find((t) => t.id === task.prerequisite_task_id);
                        if (!prereq) return null;
                        const isDone = prereq.status === 'DONE';
                        return (
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/25'
                            }`}
                            title={
                              isDone
                                ? `Prerequisite "${prereq.title}" completed!`
                                : `Locked until "${prereq.title}" is completed.`
                            }
                          >
                            {isDone ? (
                              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                            ) : (
                              <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                            <span className="truncate">
                              {isDone ? 'Prereq met: ' : 'Blocked by: '}
                              <span className="font-bold">{prereq.title}</span>
                            </span>
                          </div>
                        );
                      })()}

                      {/* Subtasks Progress Bar & Checklist */}
                      {hasSubtasks && (
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                            <span>Checklist</span>
                            <span>
                              {completedSubtasks}/{subtasks.length}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                            />
                          </div>
                          <div className="mt-2 space-y-1">
                            {subtasks.map((st) => (
                              <button
                                key={st.id}
                                onClick={() => handleToggleSubtask(task.id, st.id)}
                                className="w-full flex items-center gap-2 text-left text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                              >
                                {st.completed ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className={st.completed ? 'line-through text-slate-400' : ''}>
                                  {st.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Inline Add Subtask input */}
                      {activeSubtaskInput === task.id ? (
                        <div className="pt-1 flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddSubtask(task.id);
                              if (e.key === 'Escape') setActiveSubtaskInput(null);
                            }}
                            placeholder="Add subtask checklist item..."
                            className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                          />
                          <button
                            onClick={() => handleAddSubtask(task.id)}
                            className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold shrink-0"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setActiveSubtaskInput(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveSubtaskInput(task.id);
                            setNewSubtaskTitle('');
                          }}
                          className="text-[11px] font-semibold text-slate-400 hover:text-blue-500 flex items-center gap-1 transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Subtask</span>
                        </button>
                      )}

                      {/* Card Footer: Assignee & Column Mover buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-400 truncate max-w-[100px]">
                            {task.assignee ? (
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                @{task.assignee.username}
                              </span>
                            ) : (
                              <span className="italic text-slate-400">Unassigned</span>
                            )}
                          </span>

                          {/* Comments & Attachments count badges */}
                          {((task.comments?.[0]?.count ?? 0) > 0 ||
                            (task.attachments?.[0]?.count ?? 0) > 0 ||
                            (task.task_materials?.length ?? 0) > 0) && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                              {(task.comments?.[0]?.count ?? 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 hover:text-blue-500 transition"
                                  title={`${task.comments[0].count} comments`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>{task.comments[0].count}</span>
                                </span>
                              )}
                              {(task.attachments?.[0]?.count ?? 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 hover:text-blue-500 transition"
                                  title={`${task.attachments[0].count} attachments`}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>{task.attachments[0].count}</span>
                                </span>
                              )}
                              {task.task_materials && task.task_materials.length > 0 && (() => {
                                const cost = task.task_materials.reduce(
                                  (acc: number, m: any) =>
                                    acc +
                                    (Number(m.quantity_required) || 0) *
                                      (Number(m.inventory_item?.unit_price) || 0),
                                  0
                                );
                                const curr = task.task_materials[0]?.inventory_item?.currency || 'ILS';
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/40"
                                    title={`${task.task_materials.length} Materials linked (Est. BOM: ${formatCurrency(cost, curr)})`}
                                  >
                                    <Boxes className="w-3 h-3" />
                                    <span>{formatCurrency(cost, curr)}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {col.id !== 'TODO' && (
                            <button
                              onClick={() => {
                                const prevStatus =
                                  col.id === 'DONE'
                                    ? 'REVIEW'
                                    : col.id === 'REVIEW'
                                    ? 'IN_PROGRESS'
                                    : 'TODO';
                                handleMoveTask(task.id, prevStatus);
                              }}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                              title="Move back"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {col.id !== 'DONE' && (() => {
                            const prereq = task.prerequisite_task_id
                              ? tasks.find((t) => t.id === task.prerequisite_task_id)
                              : null;
                            const isBlockedFromDone =
                              col.id === 'REVIEW' && prereq && prereq.status !== 'DONE';

                            return (
                              <button
                                disabled={isBlockedFromDone}
                                onClick={() => {
                                  if (isBlockedFromDone) return;
                                  const nextStatus =
                                    col.id === 'TODO'
                                      ? 'IN_PROGRESS'
                                      : col.id === 'IN_PROGRESS'
                                      ? 'REVIEW'
                                      : 'DONE';
                                  handleMoveTask(task.id, nextStatus);
                                }}
                                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                  isBlockedFromDone
                                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    : col.id === 'REVIEW'
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title={
                                  isBlockedFromDone
                                    ? `Locked: Must complete "${prereq?.title}" first`
                                    : col.id === 'REVIEW'
                                    ? 'Claim XP & Complete'
                                    : 'Move forward'
                                }
                              >
                                {isBlockedFromDone ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Locked</span>
                                  </>
                                ) : col.id === 'REVIEW' ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Claim</span>
                                  </>
                                ) : (
                                  <ArrowRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div
                    className={`h-32 border-2 border-dashed rounded-2xl flex items-center justify-center text-xs text-slate-400 transition ${
                      isDropTarget
                        ? 'border-blue-500 bg-blue-50/20 text-blue-500 font-semibold'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isDropTarget ? 'Drop task here' : 'No tasks in this lane'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* -------------------------------------------------------- */}
      {/* Edit Task Workshop Modal (Details, Comments, Attachments) */}
      {/* -------------------------------------------------------- */}
      {editTaskModalOpen && editingTask && (
        <EditTaskModal
          task={editingTask}
          projectId={project.id}
          projectMembers={projectMembers}
          allSkills={allSkills}
          allTasks={tasks}
          currentUserId={userId}
          isPM={isPM}
          onClose={() => {
            setEditTaskModalOpen(false);
            setEditingTask(null);
          }}
          onTaskUpdated={(updatedTask) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
            );
            setEditingTask(null);
            setEditTaskModalOpen(false);
          }}
          onTaskDeleted={(taskId) => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setEditingTask(null);
            setEditTaskModalOpen(false);
          }}
        />
      )}

      {/* -------------------------------------------------------- */}
      {/* Edit Project Settings & Team Modal */}
      {/* -------------------------------------------------------- */}
      <EditProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={project}
        members={membersList}
        skills={projectSkillsList}
        allSkills={allSkills}
        userId={userId}
        initialTab={projectModalTab}
        onProjectUpdated={(updated) => {
          setProject(updated);
          router.refresh();
        }}
        onMembersUpdated={(newMembers) => {
          setMembersList(newMembers);
          router.refresh();
        }}
      />

      {/* -------------------------------------------------------- */}
      {/* Create Task Modal */}
      {/* -------------------------------------------------------- */}
      {taskModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setTaskModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Task</h2>
              <button
                onClick={() => setTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Design 3D printed mount assembly"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Details, requirements, links..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Completion XP Payout
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={taskXp}
                    onChange={(e) => setTaskXp(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((m: any) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={m.invitation_status === 'PENDING'}
                      >
                        {m.display_name} (@{m.username})
                        {m.invitation_status === 'PENDING' ? ' (Pending Invite)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Skill Rewarded
                  </label>
                  <select
                    value={taskSkill}
                    onChange={(e) => setTaskSkill(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                  >
                    <option value="">All Project Skills</option>
                    {allSkills.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Prerequisite Task (Optional Dependency)
                </label>
                <select
                  value={taskPrereq}
                  onChange={(e) => setTaskPrereq(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                >
                  <option value="">None (Can start immediately)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.status === 'DONE' ? '✓ ' : '🔒 '} {t.title} (
                      {t.status === 'DONE' ? 'Completed' : t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {taskLoading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Transfer PM Modal */}
      {transferModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setTransferModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Transfer Project Manager
              </h2>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferPM} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transferring the PM role gives this member full control to invite members, edit
                skills, and complete the project.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Select New PM
                </label>
                <select
                  required
                  value={newPmId}
                  onChange={(e) => setNewPmId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                >
                  <option value="">Select a member...</option>
                  {projectMembers
                    .filter((m: any) => m.id !== userId)
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} (@{m.username})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading || !newPmId}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {transferLoading ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
