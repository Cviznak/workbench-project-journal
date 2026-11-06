'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Target,
  FolderKanban,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Shield,
  Zap,
  Calendar,
  Users,
} from 'lucide-react';
import { MakerLeaderboardEntry, getSkillTier } from '@/lib/types';
import { getLevelProgress, relativeTime, cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';

interface MakersDirectoryClientProps {
  initialMakers: MakerLeaderboardEntry[];
  currentUserId?: string;
}

export default function MakersDirectoryClient({
  initialMakers,
  currentUserId,
}: MakersDirectoryClientProps) {
  const [search, setSearch] = useState('');
  const [activeSort, setActiveSort] = useState<'xp' | 'streak' | 'newest'>('xp');

  const filteredAndSortedMakers = useMemo(() => {
    let result = [...initialMakers];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.username.toLowerCase().includes(q) ||
          m.display_name.toLowerCase().includes(q) ||
          (m.bio && m.bio.toLowerCase().includes(q))
      );
    }

    // Sort order
    if (activeSort === 'xp') {
      result.sort((a, b) => {
        if (b.total_xp !== a.total_xp) return b.total_xp - a.total_xp;
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    } else if (activeSort === 'streak') {
      result.sort((a, b) => {
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
        if (b.total_xp !== a.total_xp) return b.total_xp - a.total_xp;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    } else if (activeSort === 'newest') {
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [initialMakers, search, activeSort]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-20">
      {/* ==================================================================== */}
      {/* GUEST WELCOME BANNER (IF UNAUTHENTICATED)                             */}
      {/* ==================================================================== */}
      {!currentUserId && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-600/10 via-amber-500/10 to-indigo-600/10 border border-blue-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Climb the Workbench Maker Leaderboard</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
              Track daily deliberate practice streaks, advance your craft mastery rank, and showcase your live workshop blueprints. Join for free!
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              Create Free Profile
            </Link>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DIRECTORY HERO HEADER                                                */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/20 relative overflow-hidden border border-blue-900/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-blue-200 border border-white/20">
                Community Directory
              </span>
              <span className="text-blue-200/80 text-xs font-semibold">
                {initialMakers.length} Active Makers
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <span>Maker Directory &amp; Leaderboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 max-w-2xl leading-relaxed">
              Discover top engineers, craftsmen, and inventors. Explore deliberate practice streaks, leveled skills, and public project showcases.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Link
              href="/community"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Community Feed</span>
            </Link>
            <Link
              href="/tools"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
            >
              <span>Lab Calculators</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SEARCH & SORT CONTROLS                                               */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by @username, name, or craft bio..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sort Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
          {[
            { id: 'xp', label: 'Top XP & Mastery', icon: Zap },
            { id: 'streak', label: 'Longest Streak', icon: Flame },
            { id: 'newest', label: 'Newest Makers', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSort === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSort(tab.id as any)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap',
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', active ? 'text-blue-500' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MAKERS DIRECTORY GRID                                                */}
      {/* ==================================================================== */}
      {filteredAndSortedMakers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredAndSortedMakers.map((maker, idx) => {
            const levelInfo = getLevelProgress(maker.total_xp);
            const tier = getSkillTier(levelInfo.currentLevel);

            // Top podium badge
            const isTop1 = idx === 0 && activeSort === 'xp';
            const isTop2 = idx === 1 && activeSort === 'xp';
            const isTop3 = idx === 2 && activeSort === 'xp';

            return (
              <div
                key={maker.id}
                className={cn(
                  'p-5 rounded-3xl border transition flex flex-col justify-between group relative overflow-hidden',
                  isTop1
                    ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 dark:to-slate-900 border-amber-500/40 shadow-md shadow-amber-500/5'
                    : isTop2
                    ? 'bg-gradient-to-br from-slate-200/50 via-slate-100/30 to-slate-50 dark:from-slate-800/40 dark:to-slate-900 border-slate-300 dark:border-slate-700'
                    : isTop3
                    ? 'bg-gradient-to-br from-amber-700/10 via-amber-600/5 to-slate-50 dark:to-slate-900 border-amber-700/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400/60 dark:hover:border-blue-500/60 shadow-sm'
                )}
              >
                {/* Header: Rank + Avatar + Name */}
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar
                          src={maker.avatar_url}
                          name={maker.display_name || maker.username}
                          size="xl"
                          shape="circle"
                          className="ring-2 ring-slate-100 dark:ring-slate-800 group-hover:scale-105 transition-transform"
                        />
                        {maker.current_streak > 0 && (
                          <div
                            className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md"
                            title={`${maker.current_streak}-day practice streak`}
                          >
                            🔥
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/makers/${maker.username}`}
                            className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition truncate"
                          >
                            {maker.display_name}
                          </Link>
                          {maker.role !== 'USER' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {maker.role === 'ROOT_ADMIN' ? 'ROOT' : 'ADMIN'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 block truncate">
                          @{maker.username}
                        </span>
                      </div>
                    </div>

                    {/* Rank Indicator */}
                    <div className="shrink-0">
                      {isTop1 ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 shadow-sm">
                          🥇 #1
                        </span>
                      ) : isTop2 ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          🥈 #2
                        </span>
                      ) : isTop3 ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-700/20 text-amber-800 dark:text-amber-300 border border-amber-700/30">
                          🥉 #3
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio Snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 min-h-[32px] leading-relaxed">
                    {maker.bio?.trim() || 'Multidisciplinary maker crafting and engineering in the workshop.'}
                  </p>

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {/* Level & Tier */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        {levelInfo.currentLevel}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                          Rank
                        </span>
                        <span className={cn('text-xs font-bold truncate block', tier.color)}>
                          {tier.tier}
                        </span>
                      </div>
                    </div>

                    {/* Streak & XP */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">
                        🔥
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                          Streak
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {maker.current_streak} {maker.current_streak === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary stats: Skills count, Showcases, XP */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
                    <span className="flex items-center gap-1 font-semibold">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      <span>{maker.skills_count} Skills</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{maker.public_projects_count} Showcases</span>
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {maker.total_xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <Link
                    href={`/makers/${maker.username}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition shadow-sm group-hover:border-blue-500/40"
                  >
                    <span>View Workshop Profile</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No makers found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            We couldn&apos;t find any makers matching &ldquo;{search}&rdquo;. Try another name or keyword.
          </p>
          <button
            onClick={() => setSearch('')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}
