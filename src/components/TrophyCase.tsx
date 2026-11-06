'use client';

import { Achievement, UserAchievement, AchievementTier } from '@/lib/types';
import { relativeTime, cn } from '@/lib/utils';
import {
  Trophy,
  Award,
  Zap,
  Flame,
  Shield,
  Layers,
  Package,
  FlaskConical,
  CheckCircle2,
  Users,
  Globe,
  Crown,
  Lock,
  Sparkles,
} from 'lucide-react';

interface TrophyCaseProps {
  allAchievements: Achievement[];
  userAchievements: UserAchievement[];
  isOwnProfile?: boolean;
  compact?: boolean;
}

function getTierStyles(tier: AchievementTier, isUnlocked: boolean) {
  if (!isUnlocked) {
    return {
      card: 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 opacity-55 grayscale',
      badge: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
      iconBox: 'bg-slate-200 dark:bg-slate-800 text-slate-400',
      borderGlow: '',
    };
  }

  switch (tier) {
    case 'DIAMOND':
      return {
        card: 'border-cyan-400/50 dark:border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-slate-900/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40',
        badge: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-400/40',
        iconBox: 'bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 ring-2 ring-cyan-400/50',
        borderGlow: 'text-cyan-400',
      };
    case 'GOLD':
      return {
        card: 'border-amber-400/50 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-900/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/30',
        badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40',
        iconBox: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-2 ring-amber-400/40',
        borderGlow: 'text-amber-400',
      };
    case 'SILVER':
      return {
        card: 'border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-200/40 dark:from-slate-800/60 to-slate-900/80 shadow-sm',
        badge: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
        iconBox: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-400/40',
        borderGlow: 'text-slate-400',
      };
    case 'BRONZE':
    default:
      return {
        card: 'border-amber-800/30 dark:border-amber-700/30 bg-gradient-to-br from-amber-900/10 to-slate-900/80 shadow-sm',
        badge: 'bg-amber-800/15 text-amber-800 dark:text-amber-400 border border-amber-700/30',
        iconBox: 'bg-amber-800/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-700/30',
        borderGlow: 'text-amber-600',
      };
  }
}

function renderAchievementIcon(iconName: string, className = 'w-5 h-5') {
  switch (iconName) {
    case 'zap':
      return <Zap className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'package':
      return <Package className={className} />;
    case 'flask-conical':
      return <FlaskConical className={className} />;
    case 'check-circle':
      return <CheckCircle2 className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'crown':
      return <Crown className={className} />;
    default:
      return <Award className={className} />;
  }
}

export default function TrophyCase({
  allAchievements,
  userAchievements,
  isOwnProfile = false,
  compact = false,
}: TrophyCaseProps) {
  const unlockedMap = new Map<string, UserAchievement>();
  for (const ua of userAchievements) {
    unlockedMap.set(ua.achievement_id, ua);
  }

  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (compact) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Maker Trophy Case
              </h4>
              <p className="text-[11px] text-slate-400">
                {unlockedCount} of {totalCount} Trophies Unlocked ({progressPercent}%)
              </p>
            </div>
          </div>
          <div className="h-2 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {allAchievements.slice(0, 5).map((ach) => {
            const unlocked = unlockedMap.get(ach.id);
            const isUnlocked = Boolean(unlocked);
            const styles = getTierStyles(ach.tier, isUnlocked);

            return (
              <div
                key={ach.id}
                className={cn(
                  'p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition',
                  styles.card
                )}
                title={ach.description}
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', styles.iconBox)}>
                  {isUnlocked ? (
                    renderAchievementIcon(ach.icon, 'w-4 h-4')
                  ) : (
                    <Lock className="w-4 h-4 opacity-70" />
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">
                  {ach.title}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider', styles.badge)}>
                  {ach.tier}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center ring-2 ring-amber-400/30">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg tracking-tight">
              Workshop Trophies &amp; Milestone Case
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Honoring deliberate practice consistency, workshop polymaths, inventory quartermasters, and community pillars.
            </p>
          </div>
        </div>

        <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/60 flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Trophy Progress</span>
            <span className="font-extrabold text-sm text-amber-400">
              {unlockedCount} / {totalCount} ({progressPercent}%)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-center font-black text-xs text-amber-400">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* Trophy Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAchievements.map((ach) => {
          const unlocked = unlockedMap.get(ach.id);
          const isUnlocked = Boolean(unlocked);
          const styles = getTierStyles(ach.tier, isUnlocked);

          return (
            <div
              key={ach.id}
              className={cn(
                'p-5 rounded-3xl border flex flex-col justify-between gap-4 transition group relative overflow-hidden',
                styles.card
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', styles.iconBox)}>
                    {isUnlocked ? (
                      renderAchievementIcon(ach.icon, 'w-5 h-5')
                    ) : (
                      <Lock className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider', styles.badge)}>
                      {ach.tier}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      +{ach.xp_bonus} XP
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{ach.title}</span>
                    {isUnlocked && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {ach.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] flex items-center justify-between">
                {unlocked ? (
                  <>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Unlocked</span>
                    </span>
                    <span className="text-slate-400">
                      {relativeTime(unlocked.unlocked_at)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked Milestone</span>
                    </span>
                    <span className="text-slate-400 italic">
                      In progress
                    </span>
                  </>
                )}
              </div>

              {/* Admin Note if custom granted */}
              {unlocked && unlocked.note && (
                <div className="mt-1 p-2 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-300 italic">
                  &ldquo;{unlocked.note}&rdquo;
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
