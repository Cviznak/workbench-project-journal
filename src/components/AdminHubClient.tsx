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
} from 'lucide-react';

interface AdminHubClientProps {
  caller: Profile;
  initialProfiles: Profile[];
  auditLogs: any[];
}

export default function AdminHubClient({
  caller,
  initialProfiles,
  auditLogs,
}: AdminHubClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const isRootAdmin = caller.role === 'ROOT_ADMIN';

  const filtered = profiles.filter((p) => {
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
          User directory, Genesis Root Admin protection, and PostgreSQL `SECURITY DEFINER` governance.
        </p>
      </div>

      {/* Directory Card */}
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
              {filtered.map((user) => {
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

      {/* Audit History Ledger */}
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
    </div>
  );
}
