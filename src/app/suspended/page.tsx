'use client';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ShieldX, LogOut } from 'lucide-react';

export default function SuspendedPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-8 shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Account Suspended
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Your account has been suspended by an administrator. You do not currently have access to projects, tasks, or practice logging.
        </p>

        <button
          onClick={handleSignOut}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
