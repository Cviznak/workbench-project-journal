import { createClient } from '@/lib/supabase/server';
import SkillsViewClient from '@/components/SkillsViewClient';

export default async function SkillsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch user skills, practice logs, catalog, and skill requests concurrently
  const [
    { data: userSkills },
    { data: practiceLogs },
    { data: catalog },
    { data: mySkillRequests },
  ] = await Promise.all([
    supabase
      .from('user_skills')
      .select('*, skill:skill_catalog(*)')
      .eq('user_id', user.id)
      .order('total_xp', { ascending: false }),
    supabase
      .from('practice_logs')
      .select('*, skill:skill_catalog(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('skill_catalog')
      .select('*')
      .order('name'),
    supabase
      .from('skill_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <SkillsViewClient
      initialUserSkills={userSkills || []}
      initialPracticeLogs={practiceLogs || []}
      catalog={catalog || []}
      mySkillRequests={mySkillRequests || []}
    />
  );
}
