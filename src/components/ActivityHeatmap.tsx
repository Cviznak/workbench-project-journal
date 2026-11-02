'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ActivityHeatmapDay, Profile } from '@/lib/types';
import { Flame, Trophy, Clock, Zap, CheckCircle2, Calendar } from 'lucide-react';

interface ActivityHeatmapProps {
  profile: Profile | null;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ActivityHeatmap({ profile }: ActivityHeatmapProps) {
  const supabase = createClient();
  const [days, setDays] = useState<ActivityHeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<ActivityHeatmapDay | null>(null);

  useEffect(() => {
    async function fetchHeatmap() {
      try {
        const { data, error } = await supabase.rpc('get_user_activity_heatmap', {
          p_days: 365,
        });
        if (error) throw error;
        if (data) {
          setDays(data as ActivityHeatmapDay[]);
        }
      } catch (err) {
        console.error('Failed to fetch activity heatmap:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHeatmap();
  }, [supabase]);

  // Aggregate stats across the 365-day dataset
  const stats = useMemo(() => {
    let totalXp = 0;
    let totalMinutes = 0;
    let totalTasks = 0;
    let activeDays = 0;

    days.forEach((d) => {
      totalXp += d.xp_earned || 0;
      totalMinutes += d.practice_minutes || 0;
      totalTasks += d.tasks_completed || 0;
      if (d.intensity > 0) activeDays += 1;
    });

    return { totalXp, totalMinutes, totalTasks, activeDays };
  }, [days]);

  // Organize days into a 7-row x 53-column grid structure (weeks)
  const { weeks, monthLabels } = useMemo(() => {
    if (!days.length) return { weeks: [], monthLabels: [] };

    // Group days by Sunday-first weeks
    const weekCols: (ActivityHeatmapDay | null)[][] = [];
    let currentWeek: (ActivityHeatmapDay | null)[] = [];

    // First day alignment
    const firstDate = new Date(days[0].activity_date);
    const firstDayOfWeek = firstDate.getUTCDay(); // 0 = Sun, 6 = Sat

    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    const monthCols: { month: string; colIndex: number }[] = [];
    let lastSeenMonth = -1;

    days.forEach((d) => {
      const dateObj = new Date(d.activity_date);
      const m = dateObj.getUTCMonth();

      if (m !== lastSeenMonth) {
        monthCols.push({ month: MONTH_NAMES[m], colIndex: weekCols.length });
        lastSeenMonth = m;
      }

      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weekCols.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weekCols.push(currentWeek);
    }

    return { weeks: weekCols, monthLabels: monthCols };
  }, [days]);

  const currentStreak = profile?.current_streak || 0;
  const longestStreak = profile?.longest_streak || 0;

  function getIntensityColor(intensity: number) {
    switch (intensity) {
      case 1:
        return 'bg-emerald-300 dark:bg-emerald-950 border-emerald-400/40 dark:border-emerald-800/80';
      case 2:
        return 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500/50 dark:border-emerald-600';
      case 3:
        return 'bg-emerald-500 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400';
      case 4:
        return 'bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300 ring-1 ring-emerald-400/40';
      default:
        return 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/40 dark:border-slate-800/60';
    }
  }

  function formatTooltip(day: ActivityHeatmapDay) {
    const [year, month, d] = day.activity_date.split('-');
    const dateFormatted = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${parseInt(d, 10)}, ${year}`;
    return `${dateFormatted}: ${day.xp_earned} XP earned • ${day.practice_minutes}m practiced • ${day.tasks_completed} tasks completed`;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 lg:p-7 shadow-sm space-y-6">
      {/* Header & Streak Stat Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
              Maker Consistency &amp; Activity
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            365-day rolling activity log tracking practice sessions, tasks finished, and XP momentum.
          </p>
        </div>

        {/* Streak & Consistency Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Current Streak */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Flame className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Streak
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {currentStreak} <span className="text-xs font-semibold text-slate-400">days</span>
              </div>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0">
              <Trophy className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Record
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {longestStreak} <span className="text-xs font-semibold text-slate-400">days</span>
              </div>
            </div>
          </div>

          {/* 365d XP Earned */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Year XP
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {stats.totalXp.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Active Days */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Days
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {stats.activeDays} <span className="text-xs font-semibold text-slate-400">/ 365</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Viewport */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-slate-400 text-xs">
          Loading consistency calendar...
        </div>
      ) : (
        <div className="space-y-2">
          {/* Scrollable grid container */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[760px] select-none">
              {/* Month Header row */}
              <div className="flex text-[10px] font-semibold text-slate-400 mb-1 pl-7 relative h-4">
                {monthLabels.map((m, idx) => (
                  <span
                    key={idx}
                    className="absolute"
                    style={{ left: `${m.colIndex * 14 + 28}px` }}
                  >
                    {m.month}
                  </span>
                ))}
              </div>

              {/* Day Labels + Week Columns */}
              <div className="flex gap-1">
                {/* Left day labels (Mon, Wed, Fri) */}
                <div className="flex flex-col justify-between text-[9px] font-medium text-slate-400 pr-1.5 py-0.5 select-none w-6 shrink-0">
                  <span className="h-3 leading-3">Sun</span>
                  <span className="h-3 leading-3">Tue</span>
                  <span className="h-3 leading-3">Thu</span>
                  <span className="h-3 leading-3">Sat</span>
                </div>

                {/* 53 Columns of 7 rows */}
                <div className="flex gap-1">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                      {week.map((day, dIdx) => {
                        if (!day) {
                          return (
                            <div
                              key={`empty-${wIdx}-${dIdx}`}
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] opacity-0"
                            />
                          );
                        }

                        const colorClass = getIntensityColor(day.intensity);
                        const isHovered = hoveredDay?.activity_date === day.activity_date;

                        return (
                          <div
                            key={day.activity_date}
                            title={formatTooltip(day)}
                            onMouseEnter={() => setHoveredDay(day)}
                            onMouseLeave={() => setHoveredDay(null)}
                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] border transition-all cursor-pointer ${colorClass} ${
                              isHovered
                                ? 'scale-150 z-20 shadow-md ring-2 ring-blue-500'
                                : 'hover:scale-125'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer: Hover tooltip readout & Intensity Legend */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Live Hover Readout */}
            <div className="min-h-[20px] text-slate-600 dark:text-slate-300 font-medium">
              {hoveredDay ? (
                <span className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg text-xs font-semibold">
                  <span className="text-blue-600 dark:text-blue-400">
                    {hoveredDay.activity_date}
                  </span>
                  <span>•</span>
                  <span>+{hoveredDay.xp_earned} XP</span>
                  <span>•</span>
                  <span>{hoveredDay.practice_minutes}m practice</span>
                  <span>•</span>
                  <span>{hoveredDay.tasks_completed} tasks</span>
                </span>
              ) : (
                <span className="text-slate-400 text-xs">
                  Hover over any day square to see your contribution breakdown.
                </span>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 self-end sm:self-auto shrink-0">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-800" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-300 dark:bg-emerald-950 border border-emerald-400/40" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-500" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 dark:bg-emerald-400 ring-1 ring-emerald-400/40" />
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
