import { createClient } from '@/lib/supabase/server';
import WorkspaceClient from '@/components/WorkspaceClient';

export default async function WorkspacePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: items } = await supabase
    .from('workspace_items')
    .select('*')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  return <WorkspaceClient initialItems={items || []} userId={user.id} />;
}
