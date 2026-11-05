'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import { SkillCatalog } from '@/lib/types';
import { X, Flame, CheckCircle2, Loader2, Sparkles, AlertCircle, PlusCircle, Search } from 'lucide-react';
import SkillRequestModal from './SkillRequestModal';
import SkillSelector from './SkillSelector';

interface PracticeModalProps {
  onClose: () => void;
  prefillSkill?: string;
  prefillDuration?: number;
}

export default function PracticeModal({
  onClose,
  prefillSkill = '',
  prefillDuration = 25,
}: PracticeModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [catalog, setCatalog] = useState<SkillCatalog[]>([]);
  const [userSkillIds, setUserSkillIds] = useState<string[]>([]);
  const [skillName, setSkillName] = useState(prefillSkill);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [duration, setDuration] = useState(String(prefillDuration || 25));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<any | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Load catalog skills and user practiced skills
  useEffect(() => {
    async function fetchCatalog() {
      const [{ data: catalogData }, { data: userSkillsData }] = await Promise.all([
        supabase.from('skill_catalog').select('*').order('name'),
        supabase.from('user_skills').select('skill_id'),
      ]);

      if (catalogData) {
        setCatalog(catalogData as SkillCatalog[]);
        if (prefillSkill) {
          const match = catalogData.find(
            (s) =>
              s.name.toLowerCase() === prefillSkill.toLowerCase() ||
              s.slug === prefillSkill.toLowerCase()
          );
          if (match) {
            setSelectedSkillId(match.id);
            setSkillName(match.name);
          }
        }
      }
      if (userSkillsData) {
        setUserSkillIds(userSkillsData.map((us: any) => us.skill_id));
      }
    }
    fetchCatalog();
  }, [prefillSkill]);

  const durationNum = Math.min(Math.max(parseInt(duration, 10) || 0, 1), 600);
  const deterministicXp = durationNum * 2;

  // Matching check
  const matchedSkill = catalog.find(
    (s) =>
      s.id === selectedSkillId ||
      s.name.toLowerCase() === skillName.trim().toLowerCase() ||
      s.slug === skillName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanSkill = skillName.trim();
    if (!cleanSkill) {
      setError('Please choose or enter a skill name.');
      setLoading(false);
      return;
    }

    if (!matchedSkill) {
      setError(
        `Skill "${cleanSkill}" is not yet in the catalog. Skills must be approved by an administrator before XP can be logged.`
      );
      setLoading(false);
      return;
    }

    if (durationNum < 1 || durationNum > 600) {
      setError('Duration must be between 1 and 600 minutes.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('log_skill_practice', {
        p_skill_name: matchedSkill.name,
        p_duration_minutes: durationNum,
        p_note: note.trim(),
        p_skill_id: matchedSkill.id,
      });

      if (rpcError) throw rpcError;

      if (data?.level_up) {
        sounds.playLevelUp();
        triggerCelebrationConfetti();
        setLevelUpData(data);
      } else {
        sounds.playTaskComplete();
        router.refresh();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log practice session.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {levelUpData ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-4xl animate-bounce">
                ⭐
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-widest uppercase text-amber-500">
                  Level Up Achieved!
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  Level {levelUpData.level}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You reached Level {levelUpData.level} in{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {levelUpData.skill_name}
                  </strong>
                  ! (Total: {levelUpData.total_xp} XP, +{levelUpData.xp_gained} gained)
                </p>
              </div>
              <button
                onClick={() => {
                  router.refresh();
                  onClose();
                }}
                className="mt-6 px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
              >
                Continue Making →
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Log Practice &amp; Earn XP
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deterministic XP calculated on PostgreSQL: 2 XP per minute.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{error}</span>
                    {error.includes('catalog') && (
                      <button
                        type="button"
                        onClick={() => setShowRequestModal(true)}
                        className="block mt-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Click here to submit a Skill Request →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Skill Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Skill from Catalog *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRequestModal(true)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      <span>Request New Skill</span>
                    </button>
                  </div>

                  <SkillSelector
                    skills={catalog}
                    userSkillIds={userSkillIds}
                    selectedId={matchedSkill?.id || null}
                    onChangeSingle={(id, skill) => {
                      setSelectedSkillId(id);
                      setSkillName(skill?.name || '');
                    }}
                    placeholder="Search or select an approved skill..."
                  />

                  {/* Quick Catalog Chips */}
                  {catalog.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[11px] text-slate-400">Quick select:</span>
                      {catalog.slice(0, 5).map((qs) => (
                        <button
                          key={qs.id}
                          type="button"
                          onClick={() => {
                            setSelectedSkillId(qs.id);
                            setSkillName(qs.name);
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-full transition ${
                            matchedSkill?.id === qs.id
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {qs.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration & Deterministic XP Preview */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="600"
                      required
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Deterministic XP
                    </label>
                    <div className="h-10 px-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 flex items-center justify-between text-xs font-extrabold text-blue-600 dark:text-blue-400">
                      <span>+{deterministicXp} XP</span>
                      <span className="text-[10px] font-normal text-blue-500 dark:text-blue-400/80">
                        2 XP / min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Practice Notes
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Technique practiced, insights, calibrations, or project takeaways..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !matchedSkill}
                    className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Log Practice (+{deterministicXp} XP)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {showRequestModal && (
        <SkillRequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            // Refresh catalog list
            supabase
              .from('skill_catalog')
              .select('*')
              .order('name')
              .then(({ data }) => {
                if (data) setCatalog(data as SkillCatalog[]);
              });
          }}
        />
      )}
    </>
  );
}
