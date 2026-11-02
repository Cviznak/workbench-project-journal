'use client';

import { useState } from 'react';
import { UserSkill, PracticeLog, SkillCatalog, SkillRequest, getSkillTier } from '@/lib/types';
import { getLevelProgress, formatDate, relativeTime } from '@/lib/utils';
import { Target, Plus, Flame, Clock, Calendar, Sparkles, Search, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import PracticeModal from './PracticeModal';
import SkillRequestModal from './SkillRequestModal';

interface SkillsViewClientProps {
  initialUserSkills: UserSkill[];
  initialPracticeLogs: PracticeLog[];
  catalog: SkillCatalog[];
  mySkillRequests?: SkillRequest[];
}

export default function SkillsViewClient({
  initialUserSkills,
  initialPracticeLogs,
  catalog,
  mySkillRequests = [],
}: SkillsViewClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [activeSkillPrefill, setActiveSkillPrefill] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Categories extraction
  const categories = ['ALL', ...Array.from(new Set(initialUserSkills.map((s) => s.skill?.category || 'General')))];

  const filteredSkills = initialUserSkills.filter((us) => {
    const matchesSearch =
      !search ||
      (us.skill?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (us.skill?.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' || (us.skill?.category || 'General') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Maker Skills &amp; Experience
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deterministic level progression powered by PostgreSQL `SECURITY DEFINER` RPCs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setRequestModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Request New Skill</span>
          </button>

          <button
            onClick={() => {
              setActiveSkillPrefill('');
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Log Practice Session</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your skills..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {filteredSkills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map((us) => {
            const levelInfo = getLevelProgress(us.total_xp);
            const tierInfo = getSkillTier(us.level);
            return (
              <div
                key={us.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {us.skill?.category || 'Maker Skill'}
                      </span>
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-snug">
                        {us.skill?.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${tierInfo.badgeBg}`}>
                        {tierInfo.tier}
                      </span>
                      <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-current text-blue-500" />
                        <span>Level {us.level}</span>
                      </div>
                    </div>
                  </div>

                  {/* XP Bar */}
                  <div className="space-y-1.5 my-4">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span>{us.total_xp.toLocaleString()} XP total</span>
                      <span>{levelInfo.progressPct}% to Lvl {us.level + 1}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${levelInfo.progressPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 block pt-0.5">
                      {levelInfo.toNextLevel.toLocaleString()} XP needed for Level {us.level + 1}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {us.last_practiced_at
                      ? `Practiced ${relativeTime(us.last_practiced_at)}`
                      : 'Not practiced yet'}
                  </span>
                  <button
                    onClick={() => {
                      setActiveSkillPrefill(us.skill?.name || '');
                      setModalOpen(true);
                    }}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>+ Log Practice</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mx-auto">
            🎯
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            No matching skills
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Start deliberate practice to register skills and earn XP on your profile.
          </p>
          <button
            onClick={() => {
              setActiveSkillPrefill('');
              setModalOpen(true);
            }}
            className="inline-block mt-3 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            ＋ Log First Practice Session
          </button>
        </div>
      )}

      {/* Practice Logs Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Practice History Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Auditable timestamped practice logs from your deliberate sessions.
            </p>
          </div>
        </div>

        {initialPracticeLogs && initialPracticeLogs.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {initialPracticeLogs.map((log) => (
              <div key={log.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {log.skill?.name || 'Skill Practice'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {log.duration_minutes}m
                    </span>
                  </div>
                  {log.note && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {log.note}
                    </p>
                  )}
                  <span className="text-[11px] text-slate-400 block">
                    {formatDate(log.created_at)} ({relativeTime(log.created_at)})
                  </span>
                </div>

                <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl">
                  +{log.xp_gained} XP
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">
            No practice sessions logged yet.
          </p>
        )}
      </div>

      {/* Requested Skills Status Section */}
      {mySkillRequests && mySkillRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  My Skill Requests
                </h3>
                <p className="text-xs text-slate-400">
                  Track the approval status of your custom skill submissions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setRequestModalOpen(true)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Request Another
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mySkillRequests.map((req) => (
              <div key={req.id} className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {req.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {req.category}
                    </span>
                  </div>
                  {req.reason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      &ldquo;{req.reason}&rdquo;
                    </p>
                  )}
                  {req.rejection_reason && (
                    <p className="text-xs text-red-500 dark:text-red-400">
                      Feedback: {req.rejection_reason}
                    </p>
                  )}
                  <span className="text-[10px] text-slate-400 block">
                    Requested {relativeTime(req.created_at)}
                  </span>
                </div>

                <div className="flex-shrink-0">
                  {req.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>Under Review</span>
                    </span>
                  )}
                  {req.status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approved (+25 XP)</span>
                    </span>
                  )}
                  {req.status === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Declined</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <PracticeModal
          onClose={() => setModalOpen(false)}
          prefillSkill={activeSkillPrefill}
        />
      )}

      {requestModalOpen && (
        <SkillRequestModal
          onClose={() => setRequestModalOpen(false)}
          onSuccess={() => setRequestModalOpen(false)}
        />
      )}
    </div>
  );
}
