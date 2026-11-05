'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Lightbulb,
  FolderKanban,
  Package,
  ShieldAlert,
  Settings,
  Sparkles,
  ExternalLink,
  Coffee,
} from 'lucide-react';
import { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';

interface SidebarProps {
  profile: Profile | null;
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'ROOT_ADMIN' || profile?.role === 'ADMIN';

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Community', href: '/community', icon: Sparkles },
    { label: 'Skills & XP', href: '/skills', icon: Target },
    { label: 'Ideas & Notes', href: '/workspace', icon: Lightbulb },
    { label: 'Projects & Tasks', href: '/projects', icon: FolderKanban },
    { label: 'Inventory', href: '/inventory', icon: Package },
    ...(isAdmin ? [{ label: 'Admin Hub', href: '/admin', icon: ShieldAlert }] : []),
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  // Mobile Bottom Navigation Tabs (5 primary quick routes)
  const mobileNavItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Community', href: '/community', icon: Sparkles },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'Skills', href: '/skills', icon: Target },
    { label: 'Inventory', href: '/inventory', icon: Package },
  ];

  return (
    <>
      {/* Desktop / Tablet Left Sidebar (>= lg breakpoint) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 self-start sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md shadow-blue-500/20">
              🪵
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                Workbench
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mt-1">
                Project Hub
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition group',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition',
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {profile && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {/* Buy Me a Coffee Support Button */}
            <a
              href={process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL || 'https://www.buymeacoffee.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-950 dark:text-amber-300 border border-amber-400/40 dark:border-amber-500/30 text-xs font-bold transition shadow-sm group/coffee"
              title="Support Workbench development"
            >
              <Coffee className="w-3.5 h-3.5 fill-current text-amber-900 dark:text-amber-400 group-hover/coffee:scale-110 transition-transform" />
              <span>Buy Me a Coffee</span>
            </a>

            <Link
              href={`/makers/${profile.username}`}
              className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition group"
              title="View your public maker profile"
            >
              <UserAvatar
                src={profile.avatar_url}
                name={profile.display_name || profile.username}
                size="lg"
                shape="circle"
                className="group-hover:scale-105 transition-transform"
              />
              <div className="overflow-hidden flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {profile.display_name}
                  </span>
                  {profile.is_immutable && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white" title="Immutable Root Admin">
                      ROOT
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate block">
                  @{profile.username}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        )}
      </aside>

      {/* Mobile PWA Bottom Navigation Bar (< lg breakpoint) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-1 px-2 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition min-w-[56px] relative',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform duration-150', isActive && 'scale-110')} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
