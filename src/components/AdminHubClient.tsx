'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, ActivityLog } from '@/lib/types';
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
} from 'lucide-react';
import { soundEngine, triggerConfetti } from '@/lib/soundEffects';

interface AdminHubClientProps {
  caller: Profile;
  initialProfiles: Profile[];
  auditLogs: any[];
  initialSkillRequests?: any[];
}

export default function AdminHubClient({
  caller,
  initialProfiles,
  auditLogs,
  initialSkillRequests = [],
}: AdminHubClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'users' | 'skills' | 'audit'>('users');
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [skillRequests, setSkillRequests] = useState<any[]>(initialSkillRequests);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [skillStatusFilter, setSkillStatusFilter] = useState('ALL');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalReqId, setRejectModalReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isRootAdmin = caller.role === 'ROOT_ADMIN';
  const pendingRequestsCount = skillRequests.filter((r) => r.status === 'PENDING').length;

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
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {user.display_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
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
    </div>
  );
}
