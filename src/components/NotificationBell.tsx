'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, SkillRequest } from '@/lib/types';
import { relativeTime } from '@/lib/utils';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import {
  Bell,
  Check,
  X,
  Sparkles,
  FolderKanban,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface NotificationBellProps {
  profile: Profile | null;
}

interface PendingProjectInvite {
  project_id: string;
  joined_at: string;
  invitation_status: 'PENDING' | 'ACCEPTED';
  project?: {
    id: string;
    name: string;
    description: string;
    pm?: {
      id: string;
      username: string;
      display_name: string;
    };
  };
}

export default function NotificationBell({ profile }: NotificationBellProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [invites, setInvites] = useState<PendingProjectInvite[]>([]);
  const [skillRequests, setSkillRequests] = useState<SkillRequest[]>([]);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  async function fetchNotifications() {
    if (!profile?.id) return;

    try {
      // 1. Pending project invites
      const { data: inviteData } = await supabase
        .from('project_members')
        .select(`
          project_id,
          joined_at,
          invitation_status,
          project:projects (
            id,
            name,
            description,
            pm:profiles!projects_pm_user_id_fkey (
              id,
              username,
              display_name
            )
          )
        `)
        .eq('user_id', profile.id)
        .eq('invitation_status', 'PENDING');

      if (inviteData) {
        setInvites(inviteData as any);
      }

      // 2. Skill request updates
      const { data: requestData } = await supabase
        .from('skill_requests')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (requestData) {
        setSkillRequests(requestData as SkillRequest[]);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }

  useEffect(() => {
    fetchNotifications();

    // Supabase Realtime subscription for invites
    if (!profile?.id) return;

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skill_requests',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function handleAcceptInvite(projectId: string) {
    setLoadingActionId(`accept-${projectId}`);
    try {
      const { error } = await supabase.rpc('accept_project_invite', {
        p_project_id: projectId,
      });

      if (error) throw error;

      sounds.playTaskComplete();
      triggerCelebrationConfetti();

      // Remove from pending list
      setInvites((prev) => prev.filter((i) => i.project_id !== projectId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to accept invitation');
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handleDeclineInvite(projectId: string) {
    setLoadingActionId(`decline-${projectId}`);
    try {
      const { error } = await supabase.rpc('decline_project_invite', {
        p_project_id: projectId,
      });

      if (error) throw error;

      // Remove from pending list
      setInvites((prev) => prev.filter((i) => i.project_id !== projectId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to decline invitation');
    } finally {
      setLoadingActionId(null);
    }
  }

  const unreadCount = invites.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        title="Notifications & Invitations"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
        )}
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 mt-1 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                  {unreadCount} pending
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-4 max-h-96 overflow-y-auto">
            {/* Section 1: Project Invitations */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Project Invitations ({invites.length})</span>
              </div>

              {invites.length > 0 ? (
                <div className="space-y-2">
                  {invites.map((invite) => {
                    const isAccepting = loadingActionId === `accept-${invite.project_id}`;
                    const isDeclining = loadingActionId === `decline-${invite.project_id}`;
                    const pmName =
                      invite.project?.pm?.display_name ||
                      invite.project?.pm?.username ||
                      'Project Manager';

                    return (
                      <div
                        key={invite.project_id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {invite.project?.name || 'Collaborative Project'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Invited by <strong className="text-slate-700 dark:text-slate-300">{pmName}</strong> • {relativeTime(invite.joined_at)}
                          </div>
                        </div>

                        {invite.project?.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                            &ldquo;{invite.project.description}&rdquo;
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleAcceptInvite(invite.project_id)}
                            disabled={isAccepting || isDeclining}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition"
                          >
                            {isAccepting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Accept</span>
                          </button>

                          <button
                            onClick={() => handleDeclineInvite(invite.project_id)}
                            disabled={isAccepting || isDeclining}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition"
                          >
                            {isDeclining ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-1 italic">
                  No pending project invitations.
                </p>
              )}
            </div>

            {/* Section 2: Skill Request Updates */}
            {skillRequests.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>My Skill Requests</span>
                </div>

                <div className="space-y-1.5">
                  {skillRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="overflow-hidden">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {req.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {req.category}
                        </span>
                      </div>

                      <div className="flex-shrink-0">
                        {req.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>+25 XP</span>
                          </span>
                        )}
                        {req.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Reviewing</span>
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                            <XCircle className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
