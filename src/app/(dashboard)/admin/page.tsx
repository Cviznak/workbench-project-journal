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

  // Fetch all user profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  // Fetch all activity logs for system audit
  const { data: auditLogs } = await supabase
    .from('activity_logs')
    .select('*, profile:profiles(*)')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <AdminHubClient
      caller={callerProfile as Profile}
      initialProfiles={(profiles as Profile[]) || []}
      auditLogs={auditLogs || []}
    />
  );
}
