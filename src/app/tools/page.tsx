import { createClient } from '@/lib/supabase/server';
import PublicToolsClient from '@/components/PublicToolsClient';

export const metadata = {
  title: 'Free Maker Calculators & Lab Tools | Workbench',
  description:
    'Free precision workshop calculators for creators and engineers: Epoxy Resin & Mold Volume, Perfume Dilution & Maceration, 3D Print Costing, Cross-Stitch Fabric Sizing, and Candle & Soap Batch Formulation.',
  keywords: [
    'epoxy resin calculator',
    'resin mold volume calculator',
    'perfume dilution calculator',
    'perfume alcohol ratio',
    '3d print cost calculator',
    'cross-stitch fabric calculator',
    'aida cloth size calculator',
    'cross stitch skein calculator',
    'candle wax calculator',
    'candle fragrance load calculator',
    'soap batch calculator',
    'maker tools',
    'workbench calculators',
  ],
  openGraph: {
    title: 'Free Maker Calculators & Lab Tools | Workbench',
    description:
      'Interactive precision lab calculators for makers: Epoxy Resin & Mold Volume, Perfume Dilution, 3D Print Costing, Cross-Stitch Fabric Sizing, and Candle Batch Formulation.',
    url: 'https://www.workbenchsoc.com/tools',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I calculate epoxy resin volume for silicone molds?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For rectangular molds, multiply Length × Width × Height in centimeters to find cubic centimeters (ml). For cylindrical molds, multiply π × Radius² × Height. Multiply the volume by resin density (typically 1.05 to 1.12 g/ml) to get total grams, then split according to your system ratio (e.g., 2:1 or 1:1 by weight).',
      },
    },
    {
      '@type': 'Question',
      name: 'What alcohol percentage should I use for perfume dilution?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Fine fragrance concentration standards range from Eau de Cologne (4%), Eau de Toilette (10%), Eau de Parfum (18%), to Extrait de Parfum (25%). Dilute pure fragrance oils using 96% denatured perfumer’s alcohol (SDA 40B) and allow 3 to 6 weeks of maceration in amber glass bottles for smooth molecular binding.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I calculate the true cost of a 3D print?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'True 3D printing cost combines filament weight including a 5% purge and support failure buffer, electricity consumption based on printer wattage (typically 120-250W) and machine runtime, plus machine depreciation and packaging overhead. Setting a 65% craft margin on this all-in COGS ensures sustainable workshop operation.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much extra fabric margin should I leave for cross-stitch framing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Always add a minimum of 5 cm (2 inches) of border allowance on all four sides of your stitched design. This prevents edge fraying during work and provides framers the tension required to stretch the Aida cloth without clipping edge stitches.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I calculate candle wax weight from container water capacity?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Candle wax is less dense than water (soy wax has a specific gravity of ~0.86). Multiply container water weight by 0.86 to find total fill weight. Then divide by (1 + Fragrance Load %) to determine exact wax grams, and multiply that wax weight by your fragrance percentage (typically 6-10%) for fragrance oil grams.',
      },
    },
  ],
};

interface ToolsPageProps {
  searchParams?: Promise<{ tool?: string }> | { tool?: string };
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const initialTool = resolvedParams?.tool;

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicToolsClient
        currentUser={user}
        currentProfile={profile}
        initialTool={initialTool}
      />
    </>
  );
}
