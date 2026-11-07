import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateStreak, Profile } from '@/lib/types';
import DopamineClient from '@/components/DopamineClient';

export const metadata = {
  title: 'Dopamine Hub — Instant Maker Satisfaction & Micro-Quests | Workbench',
  description:
    'Instant bursts of maker satisfaction, tactile sound synthesis, random daily creative sparks, and micro-XP mini-quests.',
};

export default async function DopaminePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile, user skills, and practice logs concurrently
  const [
    { data: profile },
    { data: userSkills },
    { data: userLogs },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_skills')
      .select('*, skill:skill_catalog(*)')
      .eq('user_id', user.id)
      .order('total_xp', { ascending: false }),
    supabase
      .from('practice_logs')
      .select('created_at')
      .eq('user_id', user.id),
  ]);

  if (profile?.is_suspended) {
    redirect('/suspended');
  }

  const totalXp = (userSkills || []).reduce((acc, s) => acc + (s.total_xp || 0), 0);
  const streakDays = calculateStreak((userLogs || []).map((l: any) => l.created_at));

  return (
    <DopamineClient
      profile={profile as Profile}
      totalXp={totalXp}
      streakDays={streakDays}
      userSkills={userSkills || []}
    />
  );
}
