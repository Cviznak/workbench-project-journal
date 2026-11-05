import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminHubClient from '@/components/AdminHubClient';
import { Profile } from '@/lib/types';

export default async function AdminHubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role !== 'ROOT_ADMIN' && callerProfile?.role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch profiles, audit logs, and skill requests concurrently
  const [
    { data: profiles },
    { data: auditLogs },
    { data: skillRequests },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('skill_requests')
      .select('*, user:profiles!skill_requests_user_id_fkey(*)')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <AdminHubClient
      caller={callerProfile as Profile}
      initialProfiles={(profiles as Profile[]) || []}
      auditLogs={auditLogs || []}
      initialSkillRequests={(skillRequests as any[]) || []}
    />
  );
}
