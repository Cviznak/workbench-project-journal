'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, AppNotification } from '@/lib/types';
import { relativeTime, cn } from '@/lib/utils';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import UserAvatar from '@/components/UserAvatar';
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
  Heart,
  MessageSquare,
  CheckSquare,
  CheckCheck,
  ExternalLink,
  MessageSquarePlus,
  Megaphone,
  Reply,
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
      avatar_url?: string | null;
    };
  };
}

export default function NotificationBell({ profile }: NotificationBellProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [invites, setInvites] = useState<PendingProjectInvite[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch invites and in-app notifications
  async function fetchAllNotifications() {
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
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', profile.id)
        .eq('invitation_status', 'PENDING');

      if (inviteData) {
        setInvites(inviteData as any);
      }

      // 2. In-App Notifications table
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*, actor:profiles!notifications_actor_id_fkey(*)')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (notifData) {
        setNotifications(notifData as AppNotification[]);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }

  useEffect(() => {
    fetchAllNotifications();

    if (!profile?.id) return;

    // Realtime subscriptions for both project_members and notifications
    const channel = supabase
      .channel(`user-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profile.id}`,
        },
        () => {
          fetchAllNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchAllNotifications();
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

      setInvites((prev) => prev.filter((i) => i.project_id !== projectId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to decline invitation');
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handleNotificationClick(notification: AppNotification) {
    // Optimistically mark as read
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );

      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)
        .then();
    }

    setIsOpen(false);

    if (notification.link_url) {
      router.push(notification.link_url);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await supabase.rpc('mark_all_notifications_read');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  }

  const unreadInvites = invites.length;
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const totalUnread = unreadInvites + unreadNotifications;

  function renderNotificationIcon(type: string) {
    switch (type) {
      case 'SKILL_REQUEST_ADMIN':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'SKILL_REQUEST_REVIEWED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'POST_LIKED':
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />;
      case 'POST_COMMENTED':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'TASK_ASSIGNED':
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case 'USER_FEEDBACK':
        return <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'FEEDBACK_REPLIED':
        return <Reply className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'SYSTEM_ANNOUNCEMENT':
        return <Megaphone className="w-3.5 h-3.5 text-violet-500 shrink-0" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  }

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
        {totalUnread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
        )}
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 mt-1 w-[calc(100vw-2rem)] sm:w-[420px] max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Notifications
              </span>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-sm">
                  {totalUnread} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadNotifications > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAllRead}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {/* Section 1: Project Invitations */}
            {invites.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>Project Invitations ({invites.length})</span>
                </div>

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
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <UserAvatar
                            src={invite.project?.pm?.avatar_url}
                            name={pmName}
                            size="sm"
                            shape="circle"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {invite.project?.name || 'Collaborative Project'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Invited by <strong className="text-slate-700 dark:text-slate-300">{pmName}</strong> • {relativeTime(invite.joined_at)}
                            </div>
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
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition"
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
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition"
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
              </div>
            )}

            {/* Section 2: In-App Activity & System Notifications */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Activity &amp; Alerts</span>
                {notifications.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {notifications.length} recent
                  </span>
                )}
              </div>

              {notifications.length > 0 ? (
                <div className="space-y-1.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        'group flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer text-left',
                        n.is_read
                          ? 'bg-transparent border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-80 hover:opacity-100'
                          : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                      )}
                    >
                      {/* Avatar or Icon */}
                      <div className="relative shrink-0 mt-0.5">
                        {n.actor ? (
                          <UserAvatar
                            src={n.actor.avatar_url}
                            name={n.actor.display_name || n.actor.username}
                            size="sm"
                            shape="circle"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {renderNotificationIcon(n.notification_type)}
                          </div>
                        )}
                        {!n.is_read && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn(
                            'text-xs line-clamp-1 block',
                            n.is_read
                              ? 'font-semibold text-slate-800 dark:text-slate-200'
                              : 'font-bold text-slate-900 dark:text-white'
                          )}>
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {relativeTime(n.created_at)}
                          </span>
                        </div>

                        {n.body && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs italic">
                  No notifications yet. You are all caught up!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
