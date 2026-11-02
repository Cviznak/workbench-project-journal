'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, Loader2 } from 'lucide-react';

interface TaskCompleteButtonProps {
  taskId: string;
  xpReward: number;
}

export default function TaskCompleteButton({ taskId, xpReward }: TaskCompleteButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('complete_project_task', {
        p_task_id: taskId,
      });

      if (error) throw error;

      setCompleted(true);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl">
        <Check className="w-3.5 h-3.5" />
        <span>Claimed!</span>
      </span>
    );
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm shadow-emerald-600/20"
      title={`Mark Done & claim +${xpReward} XP`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <>
          <Check className="w-3.5 h-3.5" />
          <span>Claim XP</span>
        </>
      )}
    </button>
  );
}
