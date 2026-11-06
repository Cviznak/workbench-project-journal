'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Target,
  FolderKanban,
  Calculator,
  MessageSquare,
  ArrowRight,
  X,
  Check,
  FlaskConical,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerCelebrationConfetti } from '@/lib/soundEffects';
import { useTranslation } from '@/lib/i18n';

interface OnboardingQuestCardProps {
  userId: string;
  totalXp: number;
  userSkillsCount: number;
  projectCount: number;
  settingsJson: any;
}

interface PendingFormula {
  toolName: string;
  title: string;
  category: string;
  instructions_md: string;
  timestamp: number;
}

export default function OnboardingQuestCard({
  userId,
  totalXp,
  userSkillsCount,
  projectCount,
  settingsJson,
}: OnboardingQuestCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [dismissed, setDismissed] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [pendingFormula, setPendingFormula] = useState<PendingFormula | null>(null);
  const [savingFormula, setSavingFormula] = useState(false);
  const [formulaSaved, setFormulaSaved] = useState(false);

  // Check localStorage for pending calculator formula
  useEffect(() => {
    try {
      const stored = localStorage.getItem('workbench_pending_formula');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.title && parsed?.instructions_md) {
          setPendingFormula(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const isOnboardingActive =
    (totalXp === 0 || userSkillsCount === 0) &&
    settingsJson?.onboarding_completed !== true &&
    !dismissed;

  async function handleDismissOnboarding() {
    setIsDismissing(true);
    try {
      const updatedSettings = {
        ...(settingsJson || {}),
        onboarding_completed: true,
      };
      await supabase
        .from('profiles')
        .update({ settings_json: updatedSettings })
        .eq('id', userId);
      setDismissed(true);
    } catch (err) {
      console.error('Failed to dismiss onboarding quest:', err);
      setDismissed(true);
    } finally {
      setIsDismissing(false);
    }
  }

  async function handleSavePendingFormula() {
    if (!pendingFormula) return;
    setSavingFormula(true);

    try {
      const { error } = await supabase.from('maker_recipes').insert({
        user_id: userId,
        title: pendingFormula.title,
        category: pendingFormula.category,
        instructions_md: pendingFormula.instructions_md,
      });

      if (error) throw error;

      localStorage.removeItem('workbench_pending_formula');
      setFormulaSaved(true);
      triggerCelebrationConfetti();
      setTimeout(() => {
        setPendingFormula(null);
        router.refresh();
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save pending formula');
    } finally {
      setSavingFormula(false);
    }
  }

  function handleDiscardPendingFormula() {
    try {
      localStorage.removeItem('workbench_pending_formula');
    } catch (_) {}
    setPendingFormula(null);
  }

  // Calculate Quest Steps Completion
  const questSteps = [
    {
      id: 'skill',
      title: t('onboarding.step_skills'),
      description: t('onboarding.step_skills_desc'),
      href: '/skills',
      cta: t('onboarding.cta_skills'),
      icon: Target,
      done: userSkillsCount > 0 || totalXp > 0,
    },
    {
      id: 'project',
      title: t('onboarding.step_project'),
      description: t('onboarding.step_project_desc'),
      href: '/projects',
      cta: t('onboarding.cta_project'),
      icon: FolderKanban,
      done: projectCount > 0,
    },
    {
      id: 'tools',
      title: t('onboarding.step_tools'),
      description: t('onboarding.step_tools_desc'),
      href: '/tools',
      cta: t('onboarding.cta_tools'),
      icon: Calculator,
      done: formulaSaved,
    },
    {
      id: 'community',
      title: t('onboarding.step_community'),
      description: t('onboarding.step_community_desc'),
      href: '/community',
      cta: t('onboarding.cta_community'),
      icon: MessageSquare,
      done: false,
    },
  ];

  const completedCount = questSteps.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / questSteps.length) * 100);

  if (!isOnboardingActive && !pendingFormula) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* ==================================================================== */}
      {/* 1. PENDING CALCULATOR FORMULA RECOVERY BANNER                         */}
      {/* ==================================================================== */}
      {pendingFormula && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-emerald-500/15 border border-amber-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <FlaskConical className="w-5 h-5 text-amber-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Formula Detected
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Save your earlier calculator results
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                <strong>&ldquo;{pendingFormula.title}&rdquo;</strong> was calculated before you signed in. Save it directly to your Workshop Formulas!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {formulaSaved ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <Check className="w-4 h-4" />
                <span>Saved to Workshop!</span>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDiscardPendingFormula}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSavePendingFormula}
                  disabled={savingFormula}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-500/20 transition"
                >
                  {savingFormula ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save as Formula</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. STARTER WORKSHOP QUEST ONBOARDING CARD                            */}
      {/* ==================================================================== */}
      {isOnboardingActive && (
        <div className="p-5 sm:p-6 lg:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-blue-500/30 dark:border-blue-500/20 shadow-lg shadow-blue-500/5 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {t('onboarding.title')}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {completedCount} of {questSteps.length} {t('onboarding.complete')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('onboarding.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {/* Progress pill */}
              <div className="hidden md:flex items-center gap-2">
                <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {progressPct}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleDismissOnboarding}
                disabled={isDismissing}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center gap-1"
                title="Dismiss onboarding quest"
              >
                <span>{t('onboarding.dismiss')}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quest Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            {questSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={cn(
                    'p-3.5 rounded-2xl border transition flex items-start justify-between gap-3',
                    step.done
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-blue-400/60 dark:hover:border-blue-500/60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('w-3.5 h-3.5', step.done ? 'text-emerald-500' : 'text-blue-500')} />
                        <h3 className={cn(
                          'text-xs font-bold',
                          step.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                        )}>
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {!step.done && (
                    <Link
                      href={step.href}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition shrink-0 self-center flex items-center gap-1"
                    >
                      <span>{step.cta}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
