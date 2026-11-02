import { createClient } from '@/lib/supabase/server';
import SkillsViewClient from '@/components/SkillsViewClient';

export default async function SkillsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch user skills
  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('*, skill:skill_catalog(*)')
    .eq('user_id', user.id)
    .order('total_xp', { ascending: false });

  // 2. Fetch practice logs
  const { data: practiceLogs } = await supabase
    .from('practice_logs')
    .select('*, skill:skill_catalog(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  // 3. Fetch global catalog for discovery
  const { data: catalog } = await supabase
    .from('skill_catalog')
    .select('*')
    .order('name');

  return (
    <SkillsViewClient
      initialUserSkills={userSkills || []}
      initialPracticeLogs={practiceLogs || []}
      catalog={catalog || []}
    />
  );
}
