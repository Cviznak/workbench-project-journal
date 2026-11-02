'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import { X, Flame, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface PracticeModalProps {
  onClose: () => void;
  prefillSkill?: string;
}

export default function PracticeModal({ onClose, prefillSkill = '' }: PracticeModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [skillName, setSkillName] = useState(prefillSkill);
  const [duration, setDuration] = useState('25');
  const [xp, setXp] = useState('25');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<any | null>(null);

  const quickSkills = [
    '3D Printing & Slicing',
    'Woodworking & Joinery',
    'Electronics & Soldering',
    'Firmware & Coding',
    '3D CAD Modeling',
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanSkill = skillName.trim();
    if (!cleanSkill) {
      setError('Please provide a skill name');
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('log_skill_practice', {
        p_skill_name: cleanSkill,
        p_duration_minutes: parseInt(duration, 10) || 25,
        p_xp: parseInt(xp, 10) || 25,
        p_note: note.trim(),
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
                ! (Total: {levelUpData.total_xp} XP)
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
                  Track your deliberate practice and level up your maker skills.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Skill Name
                </label>
                <input
                  type="text"
                  required
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g. 3D Printing, Wood Joinery, SMD Soldering"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[11px] text-slate-400">Popular:</span>
                  {quickSkills.map((qs) => (
                    <button
                      key={qs}
                      type="button"
                      onClick={() => setSkillName(qs)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      {qs}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    XP to Award
                  </label>
                  <select
                    value={xp}
                    onChange={(e) => setXp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="15">+15 XP (Quick Test / 15m)</option>
                    <option value="25">+25 XP (Standard Session / 25m)</option>
                    <option value="50">+50 XP (Deep Practice / 50m)</option>
                    <option value="100">+100 XP (Breakthrough Build)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Practice Notes
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What technique did you practice? Notes on joints, heat settings, calibration..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                  disabled={loading}
                  className="px-5 py-2 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Log &amp; Claim XP</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
