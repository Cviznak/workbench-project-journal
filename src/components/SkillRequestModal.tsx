'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { X, Sparkles, Loader2, Send, CheckCircle, Lightbulb } from 'lucide-react';
import { soundEngine } from '@/lib/soundEffects';

interface SkillRequestModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_SUGGESTIONS = [
  'Software Development',
  'Design & Creative',
  'Hardware & Electronics',
  'Crafting & Making',
  'Writing & Prose',
  'Audio & Music',
  'Strategy & Business',
  'General Craft',
];

export default function SkillRequestModal({
  onClose,
  onSuccess,
}: SkillRequestModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORY_SUGGESTIONS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a skill name.');
      return;
    }

    const finalCategory = isCustomCat
      ? customCategory.trim() || 'General'
      : category;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be signed in to request a skill.');
      }

      const { data: requestRecord, error: insertError } = await supabase
        .from('skill_requests')
        .insert({
          user_id: user.id,
          name: name.trim(),
          category: finalCategory,
          reason: reason.trim() || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Non-blocking trigger for admin email alert dispatch
      if (requestRecord?.id) {
        fetch('/api/notifications/skill-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: requestRecord.id }),
        }).catch((err) => {
          console.warn('[SkillRequestModal] Admin email trigger failed:', err);
        });
      }

      soundEngine.playTaskComplete();
      setSubmitted(true);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit skill request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Skill Request Submitted!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                Your request for <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;{name}&rdquo;</span> has been sent to the administrators for review. Once approved, it will be added to the catalog and unlocked on your profile with 25 starter XP.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Request a New Skill
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Submit a maker skill for admin approval into the global catalog.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Skill Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Skill Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Three.js &amp; WebGL, Precision Joinery, Audio Mastering"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCat(!isCustomCat)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isCustomCat ? 'Choose from list' : '+ Custom category'}
                  </button>
                </div>

                {isCustomCat ? (
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORY_SUGGESTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Justification / Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Reason or Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain what this skill entails and why it should be available on Workbench..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Tip info box */}
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2.5 text-[11px] text-blue-700 dark:text-blue-300">
                <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <span>
                  Admin approval ensures skills maintain standardized categories and prevents duplicate slugs across the platform.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit Skill Request</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
