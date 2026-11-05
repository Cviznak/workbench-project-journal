'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Project, ProjectStatus, SkillCatalog } from '@/lib/types';
import {
  Settings,
  Users,
  X,
  Search,
  UserPlus,
  Trash2,
  Crown,
  CheckCircle2,
  Clock,
  LogOut,
  Loader2,
  ShieldAlert,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react';
import SkillSelector from '@/components/SkillSelector';
import UserAvatar from '@/components/UserAvatar';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  members: any[];
  skills: any[];
  allSkills: SkillCatalog[];
  userId: string;
  initialTab?: 'team' | 'settings';
  onProjectUpdated?: (updated: Project) => void;
  onMembersUpdated?: (members: any[]) => void;
}

interface MakerSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  already_member: boolean;
}

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  members: initialMembers,
  skills,
  allSkills,
  userId,
  initialTab = 'team',
  onProjectUpdated,
  onMembersUpdated,
}: EditProjectModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const isPM = project.pm_user_id === userId;
  const [activeTab, setActiveTab] = useState<'team' | 'settings'>(initialTab);

  // Settings State
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [xpReward, setXpReward] = useState(String(project.completion_xp_reward || 100));
  const [isPublic, setIsPublic] = useState(Boolean(project.is_public));
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    skills.map((s) => s.skill_id)
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Team & Teammates State
  const [members, setMembers] = useState<any[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MakerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Transfer PM State
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);

  // Keep members in sync if initialMembers changes
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // Reset activeTab on open if initialTab passed
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setActionMessage(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialTab]);

  // Debounced Teammate Search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('search_makers_for_invite', {
          p_query: trimmed,
          p_project_id: project.id,
        });

        if (error) throw error;
        setSearchResults((data as MakerSearchResult[]) || []);
      } catch (err: any) {
        console.error('Maker search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, project.id]);

  // --------------------------------------------------------------------------
  // Handlers: Teammates (Invite, Remove, Leave, Transfer)
  // --------------------------------------------------------------------------
  async function refreshMembers() {
    const { data: freshMembers } = await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', project.id);

    const safe = [...(freshMembers || [])];
    if (project.pm && !safe.some((m) => m.user_id === project.pm_user_id)) {
      safe.unshift({
        project_id: project.id,
        user_id: project.pm_user_id,
        invitation_status: 'ACCEPTED',
        joined_at: project.created_at,
        profile: project.pm,
      });
    }

    setMembers(safe);
    if (onMembersUpdated) onMembersUpdated(safe);
  }

  async function handleInviteMaker(targetUser: MakerSearchResult) {
    if (!isPM) return;
    setActionLoading(targetUser.id);
    setActionMessage(null);

    try {
      const { data, error } = await supabase.rpc('invite_user_to_project', {
        p_project_id: project.id,
        p_target_user_id: targetUser.id,
      });

      if (error) throw error;

      // Dispatch transactional invite email alert non-blockingly via Resend
      fetch('/api/notifications/project-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          targetUserId: targetUser.id,
        }),
      }).catch((err) => {
        console.warn('[EditProjectModal] Invite email trigger error:', err);
      });

      setActionMessage({
        text: `Invited @${targetUser.username} to the team!`,
        type: 'success',
      });

      // Update search results status
      setSearchResults((prev) =>
        prev.map((r) => (r.id === targetUser.id ? { ...r, already_member: true } : r))
      );

      await refreshMembers();
      router.refresh();
    } catch (err: any) {
      setActionMessage({
        text: err.message || 'Failed to send invite',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveMember(targetUserId: string, targetUsername: string) {
    if (!isPM) return;
    if (!confirm(`Are you sure you want to remove @${targetUsername} from the project? Any incomplete tasks assigned to them will be unassigned.`)) {
      return;
    }

    setActionLoading(targetUserId);
    setActionMessage(null);

    try {
      const { error } = await supabase.rpc('remove_project_member', {
        p_project_id: project.id,
        p_target_user_id: targetUserId,
      });

      if (error) throw error;

      setActionMessage({
        text: `Removed @${targetUsername} from project roster.`,
        type: 'success',
      });

      await refreshMembers();
      router.refresh();
    } catch (err: any) {
      setActionMessage({
        text: err.message || 'Failed to remove member',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeaveProject() {
    if (isPM) {
      alert('The Project Manager cannot leave the project. Please transfer the PM role first.');
      return;
    }

    if (!confirm('Are you sure you want to leave this project? Incomplete tasks assigned to you will be unassigned.')) {
      return;
    }

    setActionLoading('leave');
    try {
      const { error } = await supabase.rpc('remove_project_member', {
        p_project_id: project.id,
        p_target_user_id: userId,
      });

      if (error) throw error;

      router.push('/projects');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to leave project');
      setActionLoading(null);
    }
  }

  async function handleTransferPM() {
    if (!transferTargetId) return;
    if (!confirm('Are you sure you want to transfer Project Manager ownership? This action cannot be undone.')) {
      return;
    }

    setActionLoading('transfer');
    try {
      const { error } = await supabase.rpc('transfer_project_pm', {
        p_project_id: project.id,
        p_new_pm_user_id: transferTargetId,
      });

      if (error) throw error;

      setTransferConfirmOpen(false);
      router.refresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to transfer PM role');
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------------------------------------------------
  // Handlers: Save Project Settings
  // --------------------------------------------------------------------------
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!isPM) return;
    setSavingSettings(true);

    try {
      // 1. Update project details
      const { data: updatedProj, error: projErr } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          description: description.trim(),
          status,
          completion_xp_reward: parseInt(xpReward, 10) || 100,
          is_public: isPublic,
        })
        .eq('id', project.id)
        .select()
        .single();

      if (projErr) throw projErr;

      // 2. Sync project_skills (delete then re-insert)
      await supabase.from('project_skills').delete().eq('project_id', project.id);

      if (selectedSkillIds.length > 0) {
        const rows = selectedSkillIds.map((sid) => ({
          project_id: project.id,
          skill_id: sid,
        }));
        await supabase.from('project_skills').insert(rows);
      }

      if (onProjectUpdated && updatedProj) {
        onProjectUpdated(updatedProj as Project);
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update project settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDeleteProject() {
    if (!isPM) return;
    if (!confirm('Are you sure you want to permanently delete this project? All associated tasks, comments, and attachments will be erased. This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;
      router.push('/projects');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              {activeTab === 'team' ? <Users className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{project.name}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isPM ? 'Project Manager Controls' : 'Team Member View'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-3 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Roster ({members.length})</span>
          </button>

          {isPM && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Project Settings &amp; Skills</span>
            </button>
          )}
        </div>

        {/* Action Feedback Toast */}
        {actionMessage && (
          <div
            className={`mt-2 p-3 rounded-xl text-xs flex items-center justify-between shrink-0 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-current opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-6">
          {/* ========================================================= */}
          {/* TAB 1: TEAM ROSTER & SEARCH                               */}
          {/* ========================================================= */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* PM Teammate Search Input */}
              {isPM ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Find &amp; Invite Teammates
                    </label>
                    <span className="text-[11px] text-slate-400">Search by @username or display name</span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type a maker's username (e.g. cviznak, alex)..."
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isSearching && (
                      <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                    )}
                  </div>

                  {/* Search Results Dropdown List */}
                  {searchQuery.trim().length > 0 && (
                    <div className="pt-1">
                      {searchResults.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                          {searchResults.map((result) => {
                            const isInviting = actionLoading === result.id;
                            return (
                              <div
                                key={result.id}
                                className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <UserAvatar
                                    src={result.avatar_url}
                                    name={result.display_name || result.username}
                                    size="md"
                                    shape="circle"
                                  />
                                  <div className="truncate">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                                      {result.display_name}
                                    </span>
                                    <span className="text-[11px] text-slate-400 block truncate">
                                      @{result.username}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  {result.already_member ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                      On Team
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isInviting}
                                      onClick={() => handleInviteMaker(result)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                                    >
                                      {isInviting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <UserPlus className="w-3.5 h-3.5" />
                                      )}
                                      <span>Invite</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : !isSearching ? (
                        <div className="p-4 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                          No registered makers found matching &quot;{searchQuery}&quot;
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Team Roster List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Active Team Roster ({members.length})
                  </h3>

                  {!isPM && (
                    <button
                      type="button"
                      onClick={handleLeaveProject}
                      disabled={actionLoading === 'leave'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition"
                    >
                      {actionLoading === 'leave' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      <span>Leave Project</span>
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {members.map((m) => {
                    const isMemberPM = m.user_id === project.pm_user_id;
                    const isSelf = m.user_id === userId;
                    const isAccepted = m.invitation_status === 'ACCEPTED';
                    const isPending = m.invitation_status === 'PENDING';
                    const profile = m.profile || {};
                    const isRemoving = actionLoading === m.user_id;

                    return (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            src={profile.avatar_url}
                            name={profile.display_name || profile.username}
                            size="lg"
                            shape="circle"
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {profile.display_name || profile.username || 'Maker'}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              @{profile.username || 'unknown'}
                            </span>
                          </div>
                        </div>

                        {/* Badges & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isMemberPM ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Crown className="w-3 h-3" />
                              <span>PM</span>
                            </span>
                          ) : isAccepted ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACCEPTED</span>
                            </span>
                          ) : isPending ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>PENDING</span>
                            </span>
                          ) : null}

                          {/* PM controls to remove/revoke member */}
                          {isPM && !isMemberPM && (
                            <button
                              type="button"
                              disabled={isRemoving}
                              onClick={() => handleRemoveMember(m.user_id, profile.username || 'user')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title={isPending ? 'Cancel Invitation' : 'Remove from Project'}
                            >
                              {isRemoving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PM Transfer Section (For PM only) */}
              {isPM && members.filter((m) => m.user_id !== userId && m.invitation_status === 'ACCEPTED').length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Transfer Project Manager Role</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Transfer full project governance and completion authority to an accepted teammate.
                  </p>

                  <div className="flex items-center gap-2">
                    <select
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none"
                    >
                      <option value="">Select an active teammate...</option>
                      {members
                        .filter((m) => m.user_id !== userId && m.invitation_status === 'ACCEPTED')
                        .map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.profile?.display_name || m.profile?.username} (@{m.profile?.username})
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      disabled={!transferTargetId || actionLoading === 'transfer'}
                      onClick={handleTransferPM}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 transition"
                    >
                      {actionLoading === 'transfer' ? 'Transferring...' : 'Transfer PM'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PROJECT SETTINGS & SKILLS (PM ONLY)                 */}
          {/* ========================================================= */}
          {activeTab === 'settings' && isPM && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Project Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Completion XP Reward
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    value={xpReward}
                    onChange={(e) => setXpReward(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none"
                  />
                </div>
              </div>

              {/* Skills linked to project */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Linked Skills (Rewarded on Project Completion)
                </label>
                <SkillSelector
                  mode="multi"
                  skills={allSkills}
                  selectedIds={selectedSkillIds}
                  onChangeMulti={setSelectedSkillIds}
                  placeholder="Search and link skills..."
                />
              </div>

              {/* Public Project Showcase Toggle */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isPublic
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Public Project Showcase</span>
                      {isPublic ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Public
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      When enabled, anyone in the community can view this project showcase and follow its updates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPublic ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isPublic ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Settings Action Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Project</span>
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
                    disabled={savingSettings}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
