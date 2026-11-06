import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import MakersDirectoryClient from '@/components/MakersDirectoryClient';

export const metadata: Metadata = {
  title: 'Maker Directory & Mastery Leaderboard | Workbench',
  description:
    'Discover top makers, engineers, and creators. Explore active practice streaks, mastery ranks, and public project blueprints on Workbench.',
  keywords: [
    'maker directory',
    'maker leaderboard',
    'creator rankings',
    'practice streak',
    'craft skills',
    'workbench makers',
  ],
  openGraph: {
    title: 'Maker Directory & Mastery Leaderboard | Workbench',
    description:
      'Discover top makers, engineers, and creators. Explore active practice streaks, mastery ranks, and public project blueprints.',
    url: 'https://www.workbenchsoc.com/makers',
  },
};

export default async function MakersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: makers } = await supabase.rpc('get_makers_leaderboard', {
    p_limit: 100,
  });

  return (
    <div className="space-y-6">
      {!user && (
        <header className="flex items-center justify-between py-3 px-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/30">
              W
            </span>
            <span className="font-black text-slate-900 dark:text-white tracking-tight">Workbench</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/community"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Community
            </Link>
            <Link
              href="/tools"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Calculators
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              Join Free
            </Link>
          </div>
        </header>
      )}

      <MakersDirectoryClient
        initialMakers={(makers as any[]) || []}
        currentUserId={user?.id || ''}
      />
    </div>
  );
}
