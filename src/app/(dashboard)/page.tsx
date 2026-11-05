import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLevelProgress, relativeTime, formatDate } from '@/lib/utils';
import { getSkillTier, calculateStreak, TaskStatus } from '@/lib/types';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import PublicLandingPage from '@/components/PublicLandingPage';
import {
  Flame,
  Target,
  CheckCircle2,
  FolderKanban,
  ArrowUpRight,
  Sparkles,
  Clock,
  Shield,
  Activity,
  Zap,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const [{ data: recentPosts }, { data: recentProjects }] = await Promise.all([
      supabase
        .from('community_posts')
        .select(`
          id,
          content_md,
          media_urls,
          created_at,
          likes_count,
          comments_count,
          author:profiles!community_posts_author_id_fkey(username, display_name, avatar_url, role),
          skill:skill_catalog(name, category)
        `)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          created_at,
          pm:profiles!projects_pm_user_id_fkey(username, display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    return (
      <PublicLandingPage
        recentPosts={recentPosts || []}
        recentProjects={recentProjects || []}
      />
    );
  }

  // Fetch all dashboard metrics concurrently
  const [
    { data: profile },
    { data: userSkills },
    { data: userLogs },
    { data: userTasks },
    { data: recentActivity },
    { count: projectCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_skills')
      .select('*, skill:skill_catalog(*)')
      .eq('user_id', user.id)
      .order('total_xp', { ascending: false }),
    supabase
      .from('practice_logs')
      .select('created_at')
      .eq('user_id', user.id),
    supabase
      .from('project_tasks')
      .select('*, project:projects(id, name), skill:skill_catalog(id, name)')
      .eq('assignee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('activity_logs')
      .select('*')
      .or(`user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true }),
  ]);

  // Compute overall XP and Tier
  const totalXp = (userSkills || []).reduce((acc, s) => acc + (s.total_xp || 0), 0);
  const levelInfo = getLevelProgress(totalXp);
  const overallTier = getSkillTier(levelInfo.currentLevel);
  const streakDays = calculateStreak((userLogs || []).map((l: any) => l.created_at));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200 min-w-0 max-w-full overflow-x-hidden">
      {/* Header Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {profile?.display_name}!
            </h1>
            {profile?.is_immutable && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Immutable Root Admin
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track builds, complete project tasks, and level up your craft.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/workspace"
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            💡 Ideas &amp; Notes
          </Link>
          <Link
            href="/projects"
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            ＋ View Projects
          </Link>
        </div>
      </div>

      {/* Gamified Level Progress Hero Card */}
      <div className="p-5 sm:p-6 lg:p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl shadow-blue-600/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-l-full pointer-events-none transform translate-x-12" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl sm:text-3xl border border-white/20 shadow-inner shrink-0">
              ⭐
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold tracking-widest uppercase text-blue-200">
                  Maker Mastery Rank
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                  {overallTier.tier}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mt-0.5">
                Level {levelInfo.currentLevel}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {/* Daily Streak Counter */}
            <div className="text-left md:text-right px-3.5 sm:px-4 py-2 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <span className="text-[11px] text-blue-200 font-semibold block uppercase tracking-wider">
                Daily Streak
              </span>
              <div className="flex items-center gap-1.5 text-lg sm:text-xl font-extrabold tracking-tight">
                <span className="text-amber-300">🔥</span>
                <span>{streakDays} {streakDays === 1 ? 'Day' : 'Days'}</span>
              </div>
            </div>

            <div className="text-left md:text-right">
              <span className="text-xs text-blue-200 block">Total Experience</span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                {totalXp.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-6 sm:mt-8 relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-100 font-medium">
            <span>
              {levelInfo.currentInLevel.toLocaleString()} / {levelInfo.neededInLevel.toLocaleString()}{' '}
              XP in Level {levelInfo.currentLevel}
            </span>
            <span>{levelInfo.toNextLevel.toLocaleString()} XP to Level {levelInfo.currentLevel + 1}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-black/20 overflow-hidden p-0.5 border border-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-500"
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-blue-200/80 pt-1">
            <span>Deterministic Curve: level = ⌊0.1 × √total_xp⌋ + 1</span>
            <span>{levelInfo.progressPct}% Completed</span>
          </div>
        </div>
      </div>

      {/* Maker Consistency & 365-Day Activity Heatmap */}
      <ActivityHeatmap profile={profile} />

      {/* Main Grid: Skills Summary + Active Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Skills & Active Tasks */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">
          {/* Top Skills Overview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Skill Mastery Catalog
                </h3>
              </div>
              <Link
                href="/skills"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>View All ({userSkills?.length || 0})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {userSkills && userSkills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userSkills.slice(0, 4).map((us: any) => {
                  const sInfo = getLevelProgress(us.total_xp);
                  const skillTier = getSkillTier(us.level);
                  return (
                    <div
                      key={us.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {us.skill?.name || 'Skill'}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {us.skill?.category || 'Maker'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${skillTier.badgeBg}`}>
                            {skillTier.tier}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                            Lvl {us.level}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{us.total_xp} XP</span>
                          <span>{sInfo.progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${sInfo.progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-sm text-slate-400">No skills logged yet.</p>
                <Link
                  href="/skills"
                  className="mt-2 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Log your first practice session →
                </Link>
              </div>
            )}
          </div>

          {/* My Tasks with Onclick Navigation to Project */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    My Tasks
                  </h3>
                  <p className="text-xs text-slate-400">Click any task to jump straight to its project board</p>
                </div>
              </div>
              <Link
                href="/projects"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>All Projects</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {userTasks && userTasks.length > 0 ? (
              <div className="space-y-2">
                {userTasks.map((task: any) => {
                  const statusConfig = {
                    TODO: { label: 'To Do', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
                    IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                    REVIEW: { label: 'Review', color: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
                    DONE: { label: 'Done (Claimed)', color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                  }[task.status as TaskStatus] || { label: task.status, color: 'bg-slate-100 text-slate-600' };

                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project_id}`}
                      className="group block p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500/60 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 shadow-sm transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              <FolderKanban className="w-3 h-3 text-slate-400" />
                              <span>{task.project?.name || 'Project'}</span>
                            </span>
                            {task.skill && (
                              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                🎯 {task.skill.name}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                            {task.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            +{task.xp_reward} XP
                          </span>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>Open Board</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-sm text-slate-400">No tasks assigned to you right now.</p>
                <Link
                  href="/projects"
                  className="mt-2 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Browse projects &amp; pick up tasks →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Activity Log Feed */}
        <div className="space-y-6 sm:space-y-8 min-w-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Recent Activity
              </h3>
            </div>

            {recentActivity && recentActivity.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="relative space-y-1">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                      {log.summary}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{relativeTime(log.created_at)}</span>
                      {log.xp_delta > 0 && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{log.xp_delta} XP
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                No activity recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
