import { createClient } from '@/lib/supabase/server';
import PublicToolsClient from '@/components/PublicToolsClient';

export const metadata = {
  title: 'Free Maker Calculators & Lab Tools | Workbench',
  description:
    'Free precision workshop calculators for creators and engineers: Epoxy Resin & Mold Volume, Perfume Dilution & Maceration, and 3D Print Filament & Electricity Costing.',
  keywords: [
    'epoxy resin calculator',
    'resin mold volume calculator',
    'perfume dilution calculator',
    'perfume alcohol ratio',
    '3d print cost calculator',
    '3d printing electricity cost',
    'maker tools',
    'workbench calculators',
  ],
  openGraph: {
    title: 'Free Maker Calculators & Lab Tools | Workbench',
    description:
      'Interactive precision lab calculators for makers: Epoxy Resin & Mold Volume, Perfume Dilution, and 3D Print Costing.',
    url: 'https://www.workbenchsoc.com/tools',
  },
};

export default async function ToolsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, role')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return <PublicToolsClient currentUser={user} currentProfile={profile} />;
}
