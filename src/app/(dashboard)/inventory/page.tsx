import { createClient } from '@/lib/supabase/server';
import InventoryClient from '@/components/InventoryClient';
import { InventoryFolder, InventoryItem } from '@/lib/types';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Maker Inventory & Smart Restock | Workbench',
  description: 'Track materials, consumables, equipment, and automated restock orders for your workshop.',
};

export default async function InventoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const [{ data: folders }, { data: items }] = await Promise.all([
    supabase
      .from('inventory_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
    supabase
      .from('inventory_items')
      .select('*, folder:inventory_folders(*)')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
  ]);

  return (
    <InventoryClient
      initialFolders={(folders as InventoryFolder[]) || []}
      initialItems={(items as InventoryItem[]) || []}
      userId={user.id}
    />
  );
}
