'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Lightbulb,
  FolderKanban,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  profile: Profile | null;
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'ROOT_ADMIN' || profile?.role === 'ADMIN';

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Skills & XP', href: '/skills', icon: Target },
    { label: 'Ideas & Notes', href: '/workspace', icon: Lightbulb },
    { label: 'Projects & Tasks', href: '/projects', icon: FolderKanban },
    ...(isAdmin ? [{ label: 'Admin Hub', href: '/admin', icon: ShieldAlert }] : []),
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {profile.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">
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
          </div>
        </div>
      )}
    </aside>
  );
}
