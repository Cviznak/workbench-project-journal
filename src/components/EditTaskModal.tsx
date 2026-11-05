'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ProjectTask,
  TaskStatus,
  TaskPriority,
  TaskSubtask,
  TaskComment,
  TaskAttachment,
  TaskMaterial,
  InventoryItem,
  Profile,
  SkillCatalog,
} from '@/lib/types';
import { relativeTime, formatDate, formatCurrency } from '@/lib/utils';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import {
  X,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Send,
  FileText,
  Image as ImageIcon,
  Download,
  UploadCloud,
  File,
  Eye,
  Check,
  Lock,
  Boxes,
  AlertTriangle,
  CornerDownRight,
} from 'lucide-react';
import SkillSelector from '@/components/SkillSelector';
import UserAvatar from '@/components/UserAvatar';

interface EditTaskModalProps {
  task: ProjectTask;
  projectId: string;
  projectMembers: any[];
  allSkills: SkillCatalog[];
  allTasks?: ProjectTask[];
  currentUserId: string;
  isPM: boolean;
  onClose: () => void;
  onTaskUpdated?: (updatedTask: ProjectTask) => void;
  onTaskDeleted?: (taskId: string) => void;
  isReadOnly?: boolean;
}

export default function EditTaskModal({
  task,
  projectId,
  projectMembers,
  allSkills,
  allTasks,
  currentUserId,
  isPM,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  isReadOnly = false,
}: EditTaskModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    'details' | 'discussion' | 'attachments' | 'materials'
  >('details');

  // Form states
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee_id || '');
  const [xpReward, setXpReward] = useState<string>(String(task.xp_reward || 25));
  const [skillId, setSkillId] = useState<string>(task.skill_id || '');
  const [prerequisiteTaskId, setPrerequisiteTaskId] = useState<string>(
    task.prerequisite_task_id || ''
  );
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingToComment, setReplyingToComment] = useState<{ id: string; authorName: string } | null>(null);

  // Attachments state
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Materials / BOM state
  const [materials, setMaterials] = useState<TaskMaterial[]>(task.task_materials || []);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>('');
  const [quantityRequired, setQuantityRequired] = useState<string>('1');
  const [addingMaterial, setAddingMaterial] = useState(false);

  // --------------------------------------------------------------------------
  // 1. Fetch Comments & Setup Realtime
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function loadComments() {
      const { data } = await supabase
        .from('task_comments')
        .select('*, author:profiles!task_comments_user_id_fkey(*)')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (data) setComments(data as any);
    }
    loadComments();

    const channel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task.id]);

  // --------------------------------------------------------------------------
  // 2. Fetch Attachments & Signed URLs
  // --------------------------------------------------------------------------
  async function loadAttachments() {
    const { data } = await supabase
      .from('task_attachments')
      .select('*, uploader:profiles!task_attachments_uploader_id_fkey(*)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false });

    if (!data) return;

    // Generate temporary signed URLs for private downloads & image previews
    const withUrls = await Promise.all(
      data.map(async (att) => {
        const { data: signed } = await supabase.storage
          .from('project-attachments')
          .createSignedUrl(att.storage_path, 3600);
        return {
          ...att,
          signedUrl: signed?.signedUrl,
        };
      })
    );

    setAttachments(withUrls as any);
  }

  useEffect(() => {
    loadAttachments();

    const channel = supabase
      .channel(`task-attachments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments',
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          loadAttachments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task.id]);

  // --------------------------------------------------------------------------
  // 3. Fetch Materials & Inventory Items
  // --------------------------------------------------------------------------
  async function loadMaterials() {
    const { data } = await supabase
      .from('task_materials')
      .select('*, inventory_item:inventory_items(*)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });

    if (data) setMaterials(data as any);
  }

  async function loadInventoryItems() {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', currentUserId)
      .order('name', { ascending: true });

    if (data) {
      setInventoryItems(data as any);
      if (data.length > 0 && !selectedInventoryItemId) {
        setSelectedInventoryItemId(data[0].id);
      }
    }
  }

  useEffect(() => {
    loadMaterials();
    loadInventoryItems();

    const channel = supabase
      .channel(`task-materials-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_materials',
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          loadMaterials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task.id]);

  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInventoryItemId) return;
    const qty = parseFloat(quantityRequired);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity required');
      return;
    }

    setAddingMaterial(true);
    const { data, error } = await supabase
      .from('task_materials')
      .insert({
        task_id: task.id,
        project_id: projectId,
        inventory_item_id: selectedInventoryItemId,
        quantity_required: qty,
        deducted: false,
      })
      .select('*, inventory_item:inventory_items(*)')
      .single();

    setAddingMaterial(false);
    if (error) {
      alert(`Failed to add material: ${error.message}`);
    } else if (data) {
      setMaterials((prev) => [...prev, data as any]);
      setQuantityRequired('1');
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    const { error } = await supabase
      .from('task_materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      alert(`Failed to remove material: ${error.message}`);
    } else {
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    }
  }

  const totalBOMCost = useMemo(() => {
    const totals: Record<string, number> = { ILS: 0, USD: 0, EUR: 0 };
    materials.forEach((m) => {
      const item = m.inventory_item;
      if (item) {
        const curr = item.currency || 'ILS';
        const lineCost = (Number(m.quantity_required) || 0) * (Number(item.unit_price) || 0);
        totals[curr] = (totals[curr] || 0) + lineCost;
      }
    });
    return totals;
  }, [materials]);

  // --------------------------------------------------------------------------
  // Handlers: Save Task Details
  // --------------------------------------------------------------------------
  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // If moved to DONE and wasn't awarded yet, call complete_project_task RPC
      if (status === 'DONE' && !task.xp_awarded) {
        const { error: rpcErr } = await supabase.rpc('complete_project_task', {
          p_task_id: task.id,
        });
        if (rpcErr) throw rpcErr;
        sounds.playTaskComplete();
        triggerCelebrationConfetti();
      }

      const { data: updated, error } = await supabase
        .from('project_tasks')
        .update({
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          assignee_id: assigneeId || null,
          xp_reward: parseInt(xpReward, 10) || 25,
          skill_id: skillId || null,
          prerequisite_task_id: prerequisiteTaskId || null,
          subtasks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .select('*, assignee:profiles!project_tasks_assignee_id_fkey(*), skill:skill_catalog(*)')
        .single();

      if (error) throw error;

      if (onTaskUpdated && updated) {
        onTaskUpdated({
          ...updated,
          comments: [{ count: comments.length }],
          attachments: [{ count: attachments.length }],
          task_materials: materials,
        } as any);
      }
      router.refresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask() {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const { error } = await supabase.from('project_tasks').delete().eq('id', task.id);
      if (error) throw error;

      if (onTaskDeleted) {
        onTaskDeleted(task.id);
      }
      router.refresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  }

  // --------------------------------------------------------------------------
  // Handlers: Comments
  // --------------------------------------------------------------------------
  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);

    try {
      const { error } = await supabase.from('task_comments').insert({
        task_id: task.id,
        project_id: projectId,
        user_id: currentUserId,
        content_md: newComment.trim(),
        parent_comment_id: replyingToComment?.id || null,
      });

      if (error) throw error;
      setNewComment('');
      setReplyingToComment(null);
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  }

  async function handleUpdateComment(commentId: string) {
    if (!editingCommentText.trim()) return;
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({
          content_md: editingCommentText.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to update comment');
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
      if (error) throw error;
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment');
    }
  }

  // --------------------------------------------------------------------------
  // Handlers: File Upload & Attachments
  // --------------------------------------------------------------------------
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Max 5MB check
    if (file.size > 5242880) {
      setUploadError('File exceeds 5MB size limit.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniquePath = `${projectId}/${task.id}/${Date.now()}_${cleanName}`;

      // 1. Upload to Supabase Storage
      const { error: storageErr } = await supabase.storage
        .from('project-attachments')
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageErr) throw storageErr;

      // 2. Insert record in task_attachments
      const { error: dbErr } = await supabase.from('task_attachments').insert({
        task_id: task.id,
        project_id: projectId,
        uploader_id: currentUserId,
        file_name: file.name,
        storage_path: uniquePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      });

      if (dbErr) throw dbErr;

      await loadAttachments();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAttachment(attachmentId: string, storagePath: string) {
    if (!confirm('Remove this attachment?')) return;

    try {
      // 1. Delete from DB
      await supabase.from('task_attachments').delete().eq('id', attachmentId);
      // 2. Delete from storage
      await supabase.storage.from('project-attachments').remove([storagePath]);
      await loadAttachments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete attachment');
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="text-lg">🛠️</span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {task.title}
                </h2>
                <span className="text-[11px] text-slate-400 block truncate">
                  Workshop Task ID: {task.id.slice(0, 8)}...
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workshop Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pt-2 pb-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'details'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Details &amp; Checklist</span>
            </button>

            {!isReadOnly && (
              <>
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'discussion'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Discussion ({comments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'attachments'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachments ({attachments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('materials')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'materials'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Materials ({materials.length})</span>
                </button>
              </>
            )}
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {/* -------------------------------------------------------------- */}
            {/* TAB 1: DETAILS & CHECKLIST                                     */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'details' && (
              <form onSubmit={handleSaveDetails} className="space-y-4">
                {isReadOnly && (
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Boxes className="w-4 h-4 shrink-0" />
                    <span>Viewing task blueprint from public showcase (Read-Only).</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task scope, assembly instructions, design specifications..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Status Lane
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Review</option>
                      <option value="DONE">Done (Awards XP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Assignee
                    </label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
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
                      Completion XP Reward
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={xpReward}
                      onChange={(e) => setXpReward(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Associated Skill
                  </label>
                  <SkillSelector
                    mode="single"
                    skills={allSkills}
                    selectedId={skillId}
                    onChangeSingle={(id) => setSkillId(id || '')}
                    placeholder="General Crafting / Project Default"
                  />
                </div>

                {/* Prerequisite Task Dependency */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Prerequisite Task (Dependency)
                    </label>
                    {prerequisiteTaskId && (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Requires completion first</span>
                      </span>
                    )}
                  </div>
                  <select
                    value={prerequisiteTaskId}
                    onChange={(e) => setPrerequisiteTaskId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">None (Can be started immediately)</option>
                    {(allTasks || [])
                      .filter((t) => t.id !== task.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.status === 'DONE' ? '✓ ' : '🔒 '} {t.title} (
                          {t.status === 'DONE' ? 'Completed' : t.status})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Subtasks Checklist */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Checklist Items ({subtasks.length})
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {subtasks.filter((s) => s.completed).length}/{subtasks.length} done
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto mb-2">
                    {subtasks.map((st, i) => (
                      <div
                        key={st.id || i}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSubtasks((prev) =>
                              prev.map((item, idx) =>
                                idx === i ? { ...item, completed: !item.completed } : item
                              )
                            );
                            sounds.playSubtaskCheck();
                          }}
                          className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0 ${
                              st.completed
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {st.completed && <Check className="w-3 h-3" />}
                          </span>
                          <span
                            className={`truncate ${
                              st.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {st.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtasks((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSubtaskTitle.trim()) {
                            setSubtasks((prev) => [
                              ...prev,
                              { id: crypto.randomUUID(), title: newSubtaskTitle.trim(), completed: false },
                            ]);
                            setNewSubtaskTitle('');
                          }
                        }
                      }}
                      placeholder="Add subtask checklist item..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubtaskTitle.trim()) {
                          setSubtasks((prev) => [
                            ...prev,
                            { id: crypto.randomUUID(), title: newSubtaskTitle.trim(), completed: false },
                          ]);
                          setNewSubtaskTitle('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-xs font-semibold"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {isReadOnly ? (
                    <>
                      <span className="text-xs font-semibold text-slate-400">
                        Public Showcase · Read-Only
                      </span>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
                      >
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleDeleteTask}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Task</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition flex items-center gap-1.5"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </form>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 2: DISCUSSION / COMMENTS                                    */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'discussion' && (
              <div className="space-y-4 flex flex-col h-full min-h-[320px]">
                {/* Comments List */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-1">
                  {comments.length > 0 ? (
                    (() => {
                      const rootComments = comments.filter((c) => !c.parent_comment_id);
                      const repliesByParent = comments.reduce((acc: Record<string, TaskComment[]>, c) => {
                        if (c.parent_comment_id) {
                          acc[c.parent_comment_id] = acc[c.parent_comment_id] || [];
                          acc[c.parent_comment_id].push(c);
                        }
                        return acc;
                      }, {});

                      return rootComments.map((comment) => {
                        const isAuthor = comment.user_id === currentUserId;
                        const author = comment.author;
                        const isEditing = editingCommentId === comment.id;
                        const replies = repliesByParent[comment.id] || [];

                        return (
                          <div key={comment.id} className="space-y-2">
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <UserAvatar
                                    src={author?.avatar_url}
                                    name={author?.display_name || author?.username}
                                    size="xs"
                                    shape="circle"
                                  />
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {author?.display_name || 'Maker'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    @{author?.username || 'user'} • {relativeTime(comment.created_at)}
                                  </span>
                                  {comment.is_edited && (
                                    <span className="text-[9px] text-slate-400 italic">(edited)</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setReplyingToComment({
                                        id: comment.id,
                                        authorName: author?.display_name || author?.username || 'Maker',
                                      })
                                    }
                                    className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1"
                                  >
                                    <CornerDownRight className="w-3 h-3" />
                                    <span>Reply</span>
                                  </button>

                                  {(isAuthor || isPM) && (
                                    <div className="flex items-center gap-1.5 ml-1">
                                      {isAuthor && !isEditing && (
                                        <button
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditingCommentText(comment.content_md);
                                          }}
                                          className="text-[11px] text-slate-400 hover:text-blue-600"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-[11px] text-slate-400 hover:text-red-500"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isEditing ? (
                                <div className="space-y-2 mt-2">
                                  <textarea
                                    rows={2}
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                                  />
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCommentId(null)}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateComment(comment.id)}
                                      className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                  {comment.content_md}
                                </p>
                              )}
                            </div>

                            {/* Nested Replies */}
                            {replies.length > 0 && (
                              <div className="ml-6 pl-3 border-l-2 border-blue-500/20 dark:border-blue-500/20 space-y-2">
                                {replies.map((reply) => {
                                  const isReplyAuthor = reply.user_id === currentUserId;
                                  const replyAuthor = reply.author;
                                  const isReplyEditing = editingCommentId === reply.id;

                                  return (
                                    <div
                                      key={reply.id}
                                      className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <UserAvatar
                                            src={replyAuthor?.avatar_url}
                                            name={replyAuthor?.display_name || replyAuthor?.username}
                                            size="xs"
                                            shape="circle"
                                          />
                                          <span className="font-bold text-slate-900 dark:text-white">
                                            {replyAuthor?.display_name || 'Maker'}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            @{replyAuthor?.username || 'user'} • {relativeTime(reply.created_at)}
                                          </span>
                                          {reply.is_edited && (
                                            <span className="text-[9px] text-slate-400 italic">(edited)</span>
                                          )}
                                        </div>

                                        {(isReplyAuthor || isPM) && (
                                          <div className="flex items-center gap-1.5">
                                            {isReplyAuthor && !isReplyEditing && (
                                              <button
                                                onClick={() => {
                                                  setEditingCommentId(reply.id);
                                                  setEditingCommentText(reply.content_md);
                                                }}
                                                className="text-[11px] text-slate-400 hover:text-blue-600"
                                              >
                                                Edit
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteComment(reply.id)}
                                              className="text-[11px] text-slate-400 hover:text-red-500"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {isReplyEditing ? (
                                        <div className="space-y-2 mt-2">
                                          <textarea
                                            rows={2}
                                            value={editingCommentText}
                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                                          />
                                          <div className="flex items-center gap-2 justify-end">
                                            <button
                                              type="button"
                                              onClick={() => setEditingCommentId(null)}
                                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateComment(reply.id)}
                                              className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700"
                                            >
                                              Save
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                          {reply.content_md}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p>No discussion yet on this task.</p>
                      <p className="text-[11px] mt-0.5">Post an update, coordinate subassemblies, or log blocker notes.</p>
                    </div>
                  )}
                </div>

                {/* Replying Banner */}
                {replyingToComment && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs">
                    <div className="flex items-center gap-1.5">
                      <CornerDownRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Replying to <strong>@{replyingToComment.authorName}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingToComment(null)}
                      className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* New Comment Input */}
                <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        replyingToComment
                          ? `Replying to @${replyingToComment.authorName}...`
                          : 'Write a message in this task discussion...'
                      }
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={postingComment || !newComment.trim()}
                      className="px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 self-end py-2.5 shadow-sm shadow-blue-500/20"
                    >
                      {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{replyingToComment ? 'Reply' : 'Post'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 3: ATTACHMENTS & PRIVATE STORAGE                           */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                {/* Upload Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  className="p-5 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/40"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    accept="image/*,.pdf,.md,.txt"
                  />
                  <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-1.5" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {uploading ? 'Uploading to private storage...' : 'Click or drag files here to upload'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Images, PDFs, Markdown &amp; Text (Max 5MB each)
                  </span>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-xs font-medium">
                    {uploadError}
                  </div>
                )}

                {/* Attachments List */}
                <div className="space-y-2">
                  {attachments.length > 0 ? (
                    attachments.map((att) => {
                      const isImage = att.mime_type.startsWith('image/');
                      const canDelete = att.uploader_id === currentUserId || isPM;

                      return (
                        <div
                          key={att.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            {isImage && att.signedUrl ? (
                              <img
                                src={att.signedUrl}
                                alt={att.file_name}
                                onClick={() => setLightboxUrl(att.signedUrl!)}
                                className="w-10 h-10 object-cover rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 dark:text-white truncate block">
                                {att.file_name}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {formatBytes(att.size_bytes)} • by @{att.uploader?.username || 'user'} • {relativeTime(att.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isImage && att.signedUrl && (
                              <button
                                onClick={() => setLightboxUrl(att.signedUrl!)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="View full image"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {att.signedUrl && (
                              <a
                                href={att.signedUrl}
                                download={att.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => handleDeleteAttachment(att.id, att.storage_path)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Delete attachment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      <Paperclip className="w-7 h-7 mx-auto mb-1.5 text-slate-300 dark:text-slate-700" />
                      <p>No attachments yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Upload schematics, photo logs, or PDFs to this task.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 4: MATERIALS & BILL OF MATERIALS (BOM)                     */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                {/* Cost & Auto-deduct Banner */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                      Estimated Task BOM Cost
                    </span>
                    <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                      {formatCurrency(totalBOMCost.ILS || 0, 'ILS')}
                      {totalBOMCost.USD > 0 && ` + ${formatCurrency(totalBOMCost.USD, 'USD')}`}
                      {totalBOMCost.EUR > 0 && ` + ${formatCurrency(totalBOMCost.EUR, 'EUR')}`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    💡 <b>Auto-Stock Deduction:</b> Materials listed here will automatically be deducted from your inventory when this task is marked <b>Done</b>.
                  </div>
                </div>

                {/* Add Material Form */}
                <form
                  onSubmit={handleAddMaterial}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Attach Workshop Material
                  </span>

                  {inventoryItems.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No materials found in your inventory. Add materials in the Inventory Hub first.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Inventory Item
                        </label>
                        <select
                          value={selectedInventoryItemId}
                          onChange={(e) => setSelectedInventoryItemId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                        >
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.quantity} {item.unit} available @ {formatCurrency(item.unit_price, item.currency)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Qty ({inventoryItems.find((i) => i.id === selectedInventoryItemId)?.unit || 'units'})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={quantityRequired}
                          onChange={(e) => setQuantityRequired(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={addingMaterial}
                          className="w-full px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Attach</span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                {/* Materials List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Attached Materials ({materials.length})
                  </span>

                  {materials.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <Boxes className="w-7 h-7 mx-auto mb-1.5 text-slate-300 dark:text-slate-700" />
                      <p>No materials linked to this task yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Attach filament, resin, screws, or wood stock above.</p>
                    </div>
                  ) : (
                    materials.map((mat) => {
                      const item = mat.inventory_item;
                      const hasEnough = item ? Number(item.quantity) >= Number(mat.quantity_required) : true;
                      const lineTotal = item
                        ? (Number(mat.quantity_required) || 0) * (Number(item.unit_price) || 0)
                        : 0;

                      return (
                        <div
                          key={mat.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {item?.name || 'Unknown Item'}
                              </span>
                              {mat.deducted ? (
                                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  ✓ Stock Deducted
                                </span>
                              ) : (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  Pending Completion
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                              <span>
                                Needs: <b>{mat.quantity_required} {item?.unit || 'pcs'}</b>
                              </span>
                              <span>•</span>
                              <span>
                                In Stock:{' '}
                                <b className={hasEnough ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                                  {item?.quantity ?? '?'} {item?.unit || ''}
                                </b>
                              </span>
                              {item?.sku_or_location && (
                                <>
                                  <span>•</span>
                                  <span>📍 {item.sku_or_location}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {formatCurrency(lineTotal, item?.currency || 'ILS')}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                @ {formatCurrency(item?.unit_price || 0, item?.currency || 'ILS')} / {item?.unit}
                              </span>
                            </div>

                            {!mat.deducted && (
                              <button
                                onClick={() => handleDeleteMaterial(mat.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Remove Material"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxUrl}
              alt="Enlarged attachment preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-slate-900 text-white shadow-lg border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
