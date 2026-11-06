'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, ActivityLog, SkillCatalogWithUsage } from '@/lib/types';
import { formatDate, relativeTime } from '@/lib/utils';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Lock,
  Crown,
  Activity,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  X,
  Users,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  MessageSquare,
  ExternalLink,
  Trash2,
  Filter,
  GitMerge,
  Pencil,
  Plus,
  Layers,
  Megaphone,
  Globe,
  Send,
  EyeOff,
  Reply,
} from 'lucide-react';
import Link from 'next/link';
import { soundEngine, triggerConfetti } from '@/lib/soundEffects';
import UserAvatar from '@/components/UserAvatar';

interface AdminHubClientProps {
  caller: Profile;
  initialProfiles: Profile[];
  auditLogs: any[];
  initialSkillRequests?: any[];
  initialFeedback?: any[];
  initialSkills?: SkillCatalogWithUsage[];
  initialCommunityPosts?: any[];
  initialShowcaseProjects?: any[];
}

export default function AdminHubClient({
  caller,
  initialProfiles,
  auditLogs,
  initialSkillRequests = [],
  initialFeedback = [],
  initialSkills = [],
  initialCommunityPosts = [],
  initialShowcaseProjects = [],
}: AdminHubClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    'users' | 'skills' | 'catalog' | 'feedback' | 'moderation' | 'audit'
  >('users');
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [skillRequests, setSkillRequests] = useState<any[]>(initialSkillRequests);
  const [feedbackList, setFeedbackList] = useState<any[]>(initialFeedback);

  // Skill Catalog state
  const [skills, setSkills] = useState<SkillCatalogWithUsage[]>(initialSkills);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [upsertModalSkill, setUpsertModalSkill] = useState<SkillCatalogWithUsage | null | 'NEW'>(null);
  const [skillFormName, setSkillFormName] = useState('');
  const [skillFormSlug, setSkillFormSlug] = useState('');
  const [skillFormCategory, setSkillFormCategory] = useState('Crafting & Making');
  const [mergeModalSource, setMergeModalSource] = useState<SkillCatalogWithUsage | null>(null);
  const [mergeTargetSkillId, setMergeTargetSkillId] = useState('');
  const [isCatalogSubmitting, setIsCatalogSubmitting] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);

  // Moderation state
  const [communityPosts, setCommunityPosts] = useState<any[]>(initialCommunityPosts);
  const [showcaseProjects, setShowcaseProjects] = useState<any[]>(initialShowcaseProjects);
  const [moderationLoadingId, setModerationLoadingId] = useState<string | null>(null);

  // System Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('/dashboard');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Feedback Reply Modal state
  const [replyModalFeedback, setReplyModalFeedback] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'OPEN' | 'REVIEWED' | 'RESOLVED'>('RESOLVED');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [skillStatusFilter, setSkillStatusFilter] = useState('ALL');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('ALL');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('ALL');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);
  const [feedbackActionLoadingId, setFeedbackActionLoadingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalReqId, setRejectModalReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isRootAdmin = caller.role === 'ROOT_ADMIN';
  const pendingRequestsCount = skillRequests.filter((r) => r.status === 'PENDING').length;
  const openFeedbackCount = feedbackList.filter((f) => f.status === 'OPEN').length;

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      !search ||
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.display_name.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL'
        ? true
        : roleFilter === 'SUSPENDED'
        ? p.is_suspended
        : p.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const filteredRequests = skillRequests.filter((r) => {
    const matchesStatus =
      skillStatusFilter === 'ALL' ? true : r.status === skillStatusFilter;
    return matchesStatus;
  });

  const filteredFeedback = feedbackList.filter((f) => {
    const matchesSearch =
      !feedbackSearch ||
      f.message.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
      (f.user?.username && f.user.username.toLowerCase().includes(feedbackSearch.toLowerCase())) ||
      (f.user?.display_name && f.user.display_name.toLowerCase().includes(feedbackSearch.toLowerCase())) ||
      (f.page_url && f.page_url.toLowerCase().includes(feedbackSearch.toLowerCase()));

    const matchesCategory =
      feedbackCategoryFilter === 'ALL' ? true : f.category === feedbackCategoryFilter;

    const matchesStatus =
      feedbackStatusFilter === 'ALL' ? true : f.status === feedbackStatusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  async function handleUpdateFeedbackStatus(feedbackId: string, newStatus: 'OPEN' | 'REVIEWED' | 'RESOLVED') {
    setFeedbackActionLoadingId(feedbackId);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) throw error;

      setFeedbackList((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status: newStatus } : f))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update feedback status');
    } finally {
      setFeedbackActionLoadingId(null);
    }
  }

  async function handleDeleteFeedback(feedbackId: string) {
    if (!confirm('Are you sure you want to permanently delete this feedback entry?')) return;
    setFeedbackActionLoadingId(feedbackId);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      setFeedbackList((prev) => prev.filter((f) => f.id !== feedbackId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete feedback entry');
    } finally {
      setFeedbackActionLoadingId(null);
    }
  }

  async function handlePromote(targetUserId: string) {
    if (!confirm('Promote this user to ADMIN?')) return;
    setLoadingId(targetUserId);

    try {
      const { error } = await supabase.rpc('promote_to_admin', {
        p_target_user_id: targetUserId,
      });

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, role: 'ADMIN' } : p))
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to promote user');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDemote(targetUserId: string) {
    if (!confirm('Demote this administrator to USER?')) return;
    setLoadingId(targetUserId);

    try {
      const { error } = await supabase.rpc('demote_to_user', {
        p_target_user_id: targetUserId,
      });

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, role: 'USER' } : p))
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to demote user');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleToggleSuspend(targetUserId: string) {
    setLoadingId(targetUserId);

    try {
      const { data, error } = await supabase.rpc('toggle_user_suspension', {
        p_target_user_id: targetUserId,
      });

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === targetUserId ? { ...p, is_suspended: data.is_suspended } : p
        )
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle suspension');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleApproveSkillRequest(requestId: string) {
    setRequestActionLoadingId(requestId);

    try {
      const { error } = await supabase.rpc('approve_skill_request', {
        p_request_id: requestId,
      });

      if (error) throw error;

      soundEngine.playLevelUp();
      triggerConfetti();

      setSkillRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: 'APPROVED', reviewed_at: new Date().toISOString() }
            : r
        )
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to approve skill request');
    } finally {
      setRequestActionLoadingId(null);
    }
  }

  async function handleConfirmReject() {
    if (!rejectModalReqId) return;
    setRequestActionLoadingId(rejectModalReqId);

    try {
      const { error } = await supabase.rpc('reject_skill_request', {
        p_request_id: rejectModalReqId,
        p_reason: rejectionReason.trim() || null,
      });

      if (error) throw error;

      setSkillRequests((prev) =>
        prev.map((r) =>
          r.id === rejectModalReqId
            ? {
                ...r,
                status: 'REJECTED',
                rejection_reason: rejectionReason.trim() || null,
                reviewed_at: new Date().toISOString(),
              }
            : r
        )
      );
      setRejectModalReqId(null);
      setRejectionReason('');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reject skill request');
    } finally {
      setRequestActionLoadingId(null);
    }
  }

  // --- Skill Catalog Handlers ---
  async function refreshSkills() {
    const { data } = await supabase.rpc('get_skill_catalog_with_usage');
    if (data) setSkills(data);
  }

  function handleOpenAddSkill() {
    setUpsertModalSkill('NEW');
    setSkillFormName('');
    setSkillFormSlug('');
    setSkillFormCategory('Crafting & Making');
  }

  function handleOpenEditSkill(skill: SkillCatalogWithUsage) {
    setUpsertModalSkill(skill);
    setSkillFormName(skill.name);
    setSkillFormSlug(skill.slug);
    setSkillFormCategory(skill.category);
  }

  async function handleSaveSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!upsertModalSkill) return;

    const trimmedName = skillFormName.trim();
    const trimmedSlug = skillFormSlug.trim().toLowerCase();
    const trimmedCategory = skillFormCategory.trim();

    if (!trimmedName || trimmedName.length < 2) {
      alert('Skill name must be at least 2 characters.');
      return;
    }
    if (!trimmedSlug || !/^[a-z0-9-]+$/.test(trimmedSlug)) {
      alert('Slug must be lowercase alphanumeric with hyphens (e.g. 3d-printing).');
      return;
    }
    if (!trimmedCategory) {
      alert('Category is required.');
      return;
    }

    setIsCatalogSubmitting(true);
    try {
      const isNew = upsertModalSkill === 'NEW';
      const { error } = await supabase.rpc('admin_upsert_skill', {
        p_skill_id: isNew ? null : upsertModalSkill.id,
        p_name: trimmedName,
        p_slug: trimmedSlug,
        p_category: trimmedCategory,
      });

      if (error) throw error;

      soundEngine.playLevelUp();
      await refreshSkills();
      setUpsertModalSkill(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save skill');
    } finally {
      setIsCatalogSubmitting(false);
    }
  }

  function handleOpenMergeSkill(skill: SkillCatalogWithUsage) {
    setMergeModalSource(skill);
    const other = skills.find((s) => s.id !== skill.id);
    setMergeTargetSkillId(other?.id || '');
  }

  async function handleConfirmMerge() {
    if (!mergeModalSource || !mergeTargetSkillId) return;
    const target = skills.find((s) => s.id === mergeTargetSkillId);
    if (!target) return;

    if (
      !confirm(
        `Are you sure you want to merge "${mergeModalSource.name}" into "${target.name}"?\n\nThis will transfer all maker XP, practice logs, tasks, and posts. The skill "${mergeModalSource.name}" will be deleted.`
      )
    ) {
      return;
    }

    setIsCatalogSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_merge_skills', {
        p_source_skill_id: mergeModalSource.id,
        p_target_skill_id: mergeTargetSkillId,
      });

      if (error) throw error;

      soundEngine.playLevelUp();
      triggerConfetti();
      await refreshSkills();
      setMergeModalSource(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to merge skills');
    } finally {
      setIsCatalogSubmitting(false);
    }
  }

  async function handleDeleteSkill(skill: SkillCatalogWithUsage) {
    if (skill.users_count > 0 || skill.practice_logs_count > 0) {
      alert(
        `Cannot delete "${skill.name}" directly because makers have XP (${skill.users_count} makers) or practice logs (${skill.practice_logs_count} logs).\n\nPlease use "Merge Skill" instead to combine it into another skill and preserve maker progress.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete unused skill "${skill.name}"?`)) {
      return;
    }

    setDeletingSkillId(skill.id);
    try {
      const { error } = await supabase.rpc('admin_delete_skill', {
        p_skill_id: skill.id,
      });

      if (error) throw error;

      soundEngine.playTaskComplete();
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete skill');
    } finally {
      setDeletingSkillId(null);
    }
  }

  // --- Feedback Reply Handlers ---
  function handleOpenReplyModal(feedback: any) {
    setReplyModalFeedback(feedback);
    setReplyText(feedback.admin_reply || '');
    setReplyStatus(feedback.status === 'OPEN' ? 'RESOLVED' : feedback.status);
  }

  async function handleConfirmReply() {
    if (!replyModalFeedback) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      alert('Please enter a reply message for the maker.');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const { error } = await supabase.rpc('admin_reply_to_feedback', {
        p_feedback_id: replyModalFeedback.id,
        p_status: replyStatus,
        p_reply: trimmed,
      });

      if (error) throw error;

      soundEngine.playTaskComplete();
      setFeedbackList((prev) =>
        prev.map((f) =>
          f.id === replyModalFeedback.id
            ? {
                ...f,
                status: replyStatus,
                admin_reply: trimmed,
                replied_at: new Date().toISOString(),
              }
            : f
        )
      );
      setReplyModalFeedback(null);
      setReplyText('');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback reply');
    } finally {
      setIsSubmittingReply(false);
    }
  }

  // --- Broadcast Handlers ---
  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    const title = broadcastTitle.trim();
    const body = broadcastBody.trim();
    const link = broadcastLink.trim() || '/dashboard';

    if (title.length < 3 || title.length > 120) {
      alert('Announcement title must be between 3 and 120 characters.');
      return;
    }
    if (body.length < 5 || body.length > 1000) {
      alert('Announcement body must be between 5 and 1000 characters.');
      return;
    }

    if (!confirm('Are you sure you want to broadcast this announcement to all active makers?')) {
      return;
    }

    setIsBroadcasting(true);
    try {
      const { data, error } = await supabase.rpc('admin_broadcast_notification', {
        p_title: title,
        p_body: body,
        p_link_url: link,
      });

      if (error) throw error;

      soundEngine.playLevelUp();
      triggerConfetti();
      alert(`🎉 Announcement successfully broadcast to ${data || 'all'} active makers!`);
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastLink('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to broadcast announcement');
    } finally {
      setIsBroadcasting(false);
    }
  }

  // --- Moderation Handlers ---
  async function handleUnpublishProject(project: any) {
    if (!confirm(`Are you sure you want to unpublish "${project.name}" from the public showcase?`)) {
      return;
    }

    setModerationLoadingId(`proj-${project.id}`);
    try {
      const { error } = await supabase.rpc('admin_unpublish_project', {
        p_project_id: project.id,
      });

      if (error) throw error;

      soundEngine.playTaskComplete();
      setShowcaseProjects((prev) => prev.filter((p) => p.id !== project.id));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to unpublish project');
    } finally {
      setModerationLoadingId(null);
    }
  }

  async function handleDeleteCommunityPost(postId: string) {
    if (!confirm('Are you sure you want to permanently delete this community post?')) {
      return;
    }

    setModerationLoadingId(`post-${postId}`);
    try {
      const { error } = await supabase.rpc('admin_delete_community_post', {
        p_post_id: postId,
      });

      if (error) throw error;

      soundEngine.playTaskComplete();
      setCommunityPosts((prev) => prev.filter((p) => p.id !== postId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete community post');
    } finally {
      setModerationLoadingId(null);
    }
  }

  const uniqueCategories = Array.from(new Set(skills.map((s) => s.category))).sort();

  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      !catalogSearch ||
      s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.slug.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCat =
      catalogCategoryFilter === 'ALL' || s.category === catalogCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Security &amp; Admin Hub
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          User directory, skill catalog approvals, Genesis Root Admin protection, and PostgreSQL `SECURITY DEFINER` governance.
        </p>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({profiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap relative ${
            activeTab === 'skills'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Skill Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
              {pendingRequestsCount} new
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Skill Catalog ({skills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap relative ${
            activeTab === 'feedback'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4 text-emerald-400" />
          <span>User Feedback ({feedbackList.length})</span>
          {openFeedbackCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
              {openFeedbackCount} open
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'moderation'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4 text-violet-400" />
          <span>Moderation &amp; Broadcast</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: User Directory */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user by @username or name..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['ALL', 'ROOT_ADMIN', 'ADMIN', 'USER', 'SUSPENDED'].map((rf) => (
                <button
                  key={rf}
                  onClick={() => setRoleFilter(rf)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    roleFilter === rf
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {rf === 'ALL'
                    ? 'All Users'
                    : rf === 'ROOT_ADMIN'
                    ? '👑 Root Admin'
                    : rf === 'ADMIN'
                    ? '🛡️ Admins'
                    : rf === 'USER'
                    ? 'Users'
                    : 'Suspended'}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Joined</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProfiles.map((user) => {
                  const isLoading = loadingId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={user.avatar_url}
                            name={user.display_name || user.username}
                            size="lg"
                            shape="circle"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {user.display_name}
                              </span>
                              {user.is_immutable && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>GENESIS</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                            user.role === 'ROOT_ADMIN'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : user.role === 'ADMIN'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {user.is_immutable && <Lock className="w-2.5 h-2.5" />}
                          <span>{user.role}</span>
                        </span>
                      </td>

                      <td className="py-4">
                        {user.is_suspended ? (
                          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
                            Suspended
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-xs text-slate-400">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="py-4 text-right">
                        {user.is_immutable ? (
                          <span
                            className="text-[11px] text-slate-400 italic flex items-center justify-end gap-1"
                            title="The Root Admin is immutable and protected by PostgreSQL trigger"
                          >
                            <Lock className="w-3 h-3 text-amber-500" />
                            <span>Immutable</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {user.role === 'USER' && (
                              <button
                                onClick={() => handlePromote(user.id)}
                                disabled={isLoading}
                                className="px-2.5 py-1 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                              >
                                Promote to Admin
                              </button>
                            )}

                            {user.role === 'ADMIN' && isRootAdmin && (
                              <button
                                onClick={() => handleDemote(user.id)}
                                disabled={isLoading}
                                className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                Demote to User
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleSuspend(user.id)}
                              disabled={isLoading}
                              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                                user.is_suspended
                                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                                  : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950'
                              }`}
                            >
                              {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : user.is_suspended ? (
                                'Reactivate'
                              ) : (
                                'Suspend'
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Skill Requests Review */}
      {activeTab === 'skills' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Skill Catalog Requests
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review proposed skills submitted by makers. Approving automatically creates a catalog row and awards 25 starter XP to the requester.
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSkillStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    skillStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All Requests'
                    : st === 'PENDING'
                    ? `Pending (${pendingRequestsCount})`
                    : st === 'APPROVED'
                    ? 'Approved'
                    : 'Declined'}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequests.map((req) => {
                const isProcessing = requestActionLoadingId === req.id;
                const requester = req.user;

                return (
                  <div key={req.id} className="py-5 first:pt-2 last:pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-base text-slate-900 dark:text-white">
                          {req.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {req.category}
                        </span>

                        {req.status === 'PENDING' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}

                        {req.status === 'APPROVED' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved &amp; Added</span>
                          </span>
                        )}

                        {req.status === 'REJECTED' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>

                      {req.reason && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                          <span className="font-semibold text-slate-400 mr-1.5">Note:</span>
                          {req.reason}
                        </p>
                      )}

                      {req.rejection_reason && (
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200/60 dark:border-red-900/40">
                          <span className="font-semibold mr-1.5">Decline Reason:</span>
                          {req.rejection_reason}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>
                          Requested by{' '}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {requester?.display_name || requester?.username || 'User'} (@{requester?.username || 'user'})
                          </strong>
                        </span>
                        <span>•</span>
                        <span>{relativeTime(req.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleApproveSkillRequest(req.id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 disabled:opacity-50 transition"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-3.5 h-3.5" />
                            )}
                            <span>Approve (+25 XP)</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectModalReqId(req.id);
                              setRejectionReason('');
                            }}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 transition"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Reviewed {req.reviewed_at ? relativeTime(req.reviewed_at) : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs">No skill requests found under this filter.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: Global Skill Catalog Manager */}
      {activeTab === 'catalog' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
          {/* Header & Add Button */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Global Skill Catalog
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  {filteredSkills.length} of {skills.length} skills
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage canonical workshop skills. Add new skills, edit slugs, or merge duplicate skills without losing user progress.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleOpenAddSkill}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Global Skill</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search skill by name or slug..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Category:
              </span>
              <button
                type="button"
                onClick={() => setCatalogCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  catalogCategoryFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Categories
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    catalogCategoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Skill</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-center">Makers</th>
                  <th className="pb-3 font-semibold text-center">Practice Logs</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSkills.map((skill) => {
                  const hasUsage = skill.users_count > 0 || skill.practice_logs_count > 0;
                  const isDeleting = deletingSkillId === skill.id;

                  return (
                    <tr
                      key={skill.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition group"
                    >
                      <td className="py-3.5 pr-4">
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {skill.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 block">
                            /{skill.slug}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {skill.category}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span
                          className={`font-semibold text-xs ${
                            skill.users_count > 0
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {skill.users_count}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span
                          className={`font-semibold text-xs ${
                            skill.practice_logs_count > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {skill.practice_logs_count}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSkill(skill)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                            title="Edit Skill Name, Slug, or Category"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenMergeSkill(skill)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 transition"
                            title="Merge this skill into another without losing maker XP or logs"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            <span>Merge</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSkill(skill)}
                            disabled={isDeleting}
                            className={`p-1.5 rounded-lg transition ${
                              hasUsage
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                            title={
                              hasUsage
                                ? `Cannot delete: ${skill.users_count} makers have XP. Use Merge instead.`
                                : 'Delete Unused Skill'
                            }
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSkills.length === 0 && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs">No skills match your filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Audit History Ledger */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              System Security &amp; Activity Audit Logs
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 text-xs flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {log.profile?.display_name || 'System'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    {log.summary}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex-shrink-0">
                  {relativeTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: User Feedback & Bug Reports */}
      {activeTab === 'feedback' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  User Feedback &amp; Bug Reports
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {filteredFeedback.length} of {feedbackList.length} shown
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review incoming bug reports, feature suggestions, and user sentiment.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                placeholder="Search feedback content or user..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters Bar: Status & Category */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Status:
              </span>
              {[
                { id: 'ALL', label: 'All Statuses' },
                { id: 'OPEN', label: '🟡 Open' },
                { id: 'REVIEWED', label: '🔵 Reviewed' },
                { id: 'RESOLVED', label: '🟢 Resolved' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setFeedbackStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    feedbackStatusFilter === st.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Type:
              </span>
              {[
                { id: 'ALL', label: 'All Types' },
                { id: 'BUG', label: '🐞 Bug' },
                { id: 'FEATURE_IDEA', label: '💡 Idea' },
                { id: 'FEEDBACK', label: '💬 Feedback' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFeedbackCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    feedbackCategoryFilter === cat.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Items List */}
          {filteredFeedback.length > 0 ? (
            <div className="space-y-4">
              {filteredFeedback.map((fb) => {
                const isProcessing = feedbackActionLoadingId === fb.id;
                return (
                  <div
                    key={fb.id}
                    className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3.5 transition"
                  >
                    {/* Top Row: User & Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={fb.user?.avatar_url}
                          name={fb.user?.display_name || fb.user?.username || 'Guest'}
                          size="md"
                          shape="circle"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {fb.user?.display_name || 'Guest / Unlinked'}
                            </span>
                            {fb.user?.username && (
                              <Link
                                href={`/makers/${fb.user.username}`}
                                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                @{fb.user.username}
                              </Link>
                            )}
                            {fb.user?.role && fb.user.role !== 'USER' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {fb.user.role}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Submitted {relativeTime(fb.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Badges: Category & Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            fb.category === 'BUG'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : fb.category === 'FEATURE_IDEA'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {fb.category === 'BUG' ? (
                            <>
                              <Bug className="w-3 h-3" />
                              <span>Bug Report</span>
                            </>
                          ) : fb.category === 'FEATURE_IDEA' ? (
                            <>
                              <Lightbulb className="w-3 h-3" />
                              <span>Feature Idea</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3" />
                              <span>Feedback</span>
                            </>
                          )}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            fb.status === 'OPEN'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : fb.status === 'REVIEWED'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {fb.status === 'OPEN' ? (
                            <span>🟡 Open</span>
                          ) : fb.status === 'REVIEWED' ? (
                            <span>🔵 Reviewed</span>
                          ) : (
                            <span>🟢 Resolved</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Page URL (if captured) */}
                    {fb.page_url && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400">Captured on:</span>
                        <Link
                          href={fb.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{fb.page_url}</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </Link>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {fb.message}
                    </div>

                    {/* Admin Reply (if exists) */}
                    {fb.admin_reply && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <div className="flex items-center gap-1.5">
                            <Reply className="w-3.5 h-3.5" />
                            <span>
                              Admin Reply {fb.replied_at && `• ${relativeTime(fb.replied_at)}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenReplyModal(fb)}
                            className="text-[11px] underline hover:text-amber-700 dark:hover:text-amber-300"
                          >
                            Edit Reply
                          </button>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {fb.admin_reply}
                        </p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Reply Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenReplyModal(fb)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/80 transition disabled:opacity-50"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span>{fb.admin_reply ? 'Edit Reply' : 'Reply to Maker'}</span>
                        </button>

                        {fb.status !== 'REVIEWED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedbackStatus(fb.id, 'REVIEWED')}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Reviewed</span>
                          </button>
                        )}

                        {fb.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedbackStatus(fb.id, 'RESOLVED')}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}

                        {fb.status !== 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedbackStatus(fb.id, 'OPEN')}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                          >
                            <span>Reopen</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteFeedback(fb.id)}
                        disabled={isProcessing}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                        title="Delete feedback entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs">No feedback entries found matching your search or filters.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: Moderation & System Broadcast */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          {/* Section 1: System Broadcast Composer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-violet-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Broadcast System Announcement
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dispatch an immediate in-app notification to all active, non-suspended makers across the platform.
              </p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. 🚀 Workbench v2.8 Released: Global Skill Catalog & Governance"
                    required
                    maxLength={120}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Action Destination Link
                  </label>
                  <input
                    type="text"
                    value={broadcastLink}
                    onChange={(e) => setBroadcastLink(e.target.value)}
                    placeholder="/dashboard, /community, /tools..."
                    required
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Announcement Message
                </label>
                <textarea
                  rows={3}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Share platform maintenance alerts, new feature updates, or community announcements..."
                  required
                  maxLength={1000}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/20 transition disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Broadcast to All Makers</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Public Showcase Projects Moderation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Public Showcase Projects
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {showcaseProjects.length} live
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review projects featured on the public showcase. Unpublish inappropriate projects with 1 click.
                </p>
              </div>
            </div>

            {showcaseProjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Project</th>
                      <th className="pb-3 font-semibold">Creator</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Updated</th>
                      <th className="pb-3 font-semibold text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {showcaseProjects.map((proj) => {
                      const isModifying = moderationLoadingId === `proj-${proj.id}`;

                      return (
                        <tr
                          key={proj.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition"
                        >
                          <td className="py-3 pr-4">
                            <div>
                              <Link
                                href={`/projects/${proj.id}`}
                                className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5"
                              >
                                <span>{proj.name}</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </Link>
                              {proj.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm">
                                  {proj.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <UserAvatar
                                src={proj.pm?.avatar_url}
                                name={proj.pm?.display_name || proj.pm?.username || 'Maker'}
                                size="sm"
                                shape="circle"
                              />
                              <div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                  {proj.pm?.display_name || 'Maker'}
                                </span>
                                {proj.pm?.username && (
                                  <Link
                                    href={`/makers/${proj.pm.username}`}
                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    @{proj.pm.username}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {proj.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-400">
                            {relativeTime(proj.updated_at || proj.created_at)}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleUnpublishProject(proj)}
                              disabled={isModifying}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition disabled:opacity-50"
                              title="Remove project from public showcase"
                            >
                              {isModifying ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                              <span>Unpublish</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No projects are currently published to the showcase.
              </div>
            )}
          </div>

          {/* Section 3: Community Posts Moderation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Community Feed Moderation
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {communityPosts.length} recent
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review and moderate community posts. Inappropriate content can be permanently deleted.
                </p>
              </div>
            </div>

            {communityPosts.length > 0 ? (
              <div className="space-y-3">
                {communityPosts.map((post) => {
                  const isModifying = moderationLoadingId === `post-${post.id}`;

                  return (
                    <div
                      key={post.id}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <UserAvatar
                          src={post.author?.avatar_url}
                          name={post.author?.display_name || post.author?.username || 'Maker'}
                          size="md"
                          shape="circle"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {post.author?.display_name || 'Maker'}
                            </span>
                            {post.author?.username && (
                              <Link
                                href={`/makers/${post.author.username}`}
                                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                @{post.author.username}
                              </Link>
                            )}
                            <span className="text-[10px] text-slate-400">
                              • {relativeTime(post.created_at)}
                            </span>
                            {post.skill && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {post.skill.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-1">
                            {post.content_md}
                          </p>
                          {post.image_url && (
                            <div className="mt-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={post.image_url}
                                alt="Post attachment"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Link
                          href={`/community/${post.id}`}
                          target="_blank"
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                          title="View Permalink"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDeleteCommunityPost(post.id)}
                          disabled={isModifying}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition disabled:opacity-50"
                          title="Permanently Delete Community Post"
                        >
                          {isModifying ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent community posts found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decline Skill Request Modal */}
      {rejectModalReqId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setRejectModalReqId(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Decline Skill Request
              </h3>
              <button
                onClick={() => setRejectModalReqId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide an optional note to explain why this skill cannot be added to the catalog at this time.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. A similar skill already exists in the catalog under 'Web Development'..."
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalReqId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!!requestActionLoadingId}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition flex items-center gap-1.5"
              >
                {requestActionLoadingId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirm Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upsert Skill Modal */}
      {upsertModalSkill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setUpsertModalSkill(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {upsertModalSkill === 'NEW' ? 'Add Global Skill' : `Edit Skill: ${upsertModalSkill.name}`}
              </h3>
              <button
                onClick={() => setUpsertModalSkill(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSkill} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={skillFormName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSkillFormName(name);
                    if (upsertModalSkill === 'NEW') {
                      setSkillFormSlug(
                        name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                      );
                    }
                  }}
                  placeholder="e.g. Glassblowing, Pottery, CNC Milling"
                  required
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Skill Slug (Lowercase alphanumeric &amp; hyphens)
                </label>
                <input
                  type="text"
                  value={skillFormSlug}
                  onChange={(e) => setSkillFormSlug(e.target.value.toLowerCase().trim())}
                  placeholder="e.g. glassblowing, cnc-milling"
                  required
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <input
                  type="text"
                  list="category-suggestions"
                  value={skillFormCategory}
                  onChange={(e) => setSkillFormCategory(e.target.value)}
                  placeholder="e.g. Crafting & Making, Audio & Music, Software & Code"
                  required
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="category-suggestions">
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                  <option value="Crafting & Making" />
                  <option value="3D Design & Printing" />
                  <option value="Electronics & Robotics" />
                  <option value="Software & Code" />
                  <option value="Audio & Music" />
                  <option value="Culinary Arts" />
                  <option value="General" />
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpsertModalSkill(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCatalogSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5"
                >
                  {isCatalogSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{upsertModalSkill === 'NEW' ? 'Create Skill' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Skills Modal */}
      {mergeModalSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setMergeModalSource(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Merge Duplicate Skill
                </h3>
              </div>
              <button
                onClick={() => setMergeModalSource(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
              <span className="font-bold text-amber-700 dark:text-amber-400 block">
                Source Skill to Merge (Will be deleted):
              </span>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-semibold">
                <span>{mergeModalSource.name} (/{mergeModalSource.slug})</span>
                <span className="text-[11px] text-slate-400">
                  {mergeModalSource.users_count} makers • {mergeModalSource.practice_logs_count} logs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                All maker XP, practice logs, project tasks, and community posts will be safely moved into the destination skill. Combined XP will recalculate levels deterministically.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Select Destination Skill
              </label>
              <select
                value={mergeTargetSkillId}
                onChange={(e) => setMergeTargetSkillId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="" disabled>-- Choose Target Skill --</option>
                {skills
                  .filter((s) => s.id !== mergeModalSource.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMergeModalSource(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={isCatalogSubmitting || !mergeTargetSkillId}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCatalogSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm &amp; Merge Skills</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reply to Feedback Modal */}
      {replyModalFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setReplyModalFeedback(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Reply to Maker Feedback
                </h3>
              </div>
              <button
                onClick={() => setReplyModalFeedback(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>
                  From:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {replyModalFeedback.user?.display_name ||
                      replyModalFeedback.user?.username ||
                      'Guest'}
                  </strong>
                </span>
                <span>
                  Category:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {replyModalFeedback.category}
                  </strong>
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 line-clamp-3 pt-1">
                {replyModalFeedback.message}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Update Status
              </label>
              <div className="flex items-center gap-2">
                {(['REVIEWED', 'RESOLVED', 'OPEN'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setReplyStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      replyStatus === st
                        ? st === 'RESOLVED'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : st === 'REVIEWED'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st === 'RESOLVED' ? '🟢 Resolved' : st === 'REVIEWED' ? '🔵 Reviewed' : '🟡 Open'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Your Reply to Maker (Max 2000 chars)
              </label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="e.g. Thank you for reporting this issue! We deployed a patch in v2.8..."
                required
                maxLength={2000}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
              <span className="text-[10px] text-slate-400 block text-right">
                {replyText.length}/2000
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplyModalFeedback(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReply}
                disabled={isSubmittingReply || !replyText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReply && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Reply &amp; Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
