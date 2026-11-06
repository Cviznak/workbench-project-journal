'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  MessageSquare,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackCategory } from '@/lib/types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  userId,
}: FeedbackModalProps) {
  const pathname = usePathname();
  const supabase = createClient();

  const [category, setCategory] = useState<FeedbackCategory>('FEEDBACK');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();

    if (trimmed.length < 5) {
      setErrorMessage('Please provide at least 5 characters of detail.');
      return;
    }
    if (trimmed.length > 3000) {
      setErrorMessage('Feedback must be 3,000 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const pageUrl = typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : pathname;

      const { error } = await supabase.from('user_feedback').insert({
        user_id: userId,
        category,
        message: trimmed,
        page_url: pageUrl,
        status: 'OPEN',
      });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const categoryOptions: Array<{
    id: FeedbackCategory;
    label: string;
    icon: typeof Bug;
    desc: string;
  }> = [
    {
      id: 'FEEDBACK',
      label: 'General Feedback',
      icon: MessageSquare,
      desc: 'Thoughts & suggestions',
    },
    {
      id: 'FEATURE_IDEA',
      label: 'Feature Idea',
      icon: Lightbulb,
      desc: 'Workflows & capabilities',
    },
    {
      id: 'BUG',
      label: 'Bug Report',
      icon: Bug,
      desc: 'Glitch or broken tool',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Feedback Received!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Thank you for helping us polish Workbench! Your report has been dispatched directly to the admin team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Share Feedback or Report a Bug
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Help us build a better craft &amp; engineering operating system.
                </p>
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categoryOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = category === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategory(opt.id)}
                      className={cn(
                        'flex flex-col items-center text-center p-2.5 rounded-2xl border text-xs font-semibold transition',
                        selected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 mb-1', selected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400')} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Details
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === 'BUG'
                    ? 'What happened, what did you expect to happen, and what steps lead to the issue?'
                    : category === 'FEATURE_IDEA'
                    ? 'What feature, tool, or calculator would elevate your workshop workflow?'
                    : 'Tell us how we can improve Workbench, what you love, or what you would change...'
                }
                rows={4}
                maxLength={3000}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-[280px]">Page: {pathname}</span>
                </span>
                <span>{message.length} / 3000</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || message.trim().length < 5}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm shadow-blue-500/20 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
