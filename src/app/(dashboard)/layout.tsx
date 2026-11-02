import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Profile } from '@/lib/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.is_suspended) {
    redirect('/suspended');
  }

  // Compute total user XP across all user_skills
  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('total_xp')
    .eq('user_id', user.id);

  const totalXp = (userSkills || []).reduce((acc, s) => acc + (s.total_xp || 0), 0);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 max-w-full overflow-x-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <Navbar profile={profile as Profile} totalXp={totalXp} />
        <main className="flex-1 p-3 sm:p-4 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
