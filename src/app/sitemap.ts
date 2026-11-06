import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.workbenchsoc.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return staticRoutes;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch non-suspended profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, created_at')
      .eq('is_suspended', false)
      .limit(200);

    const profileRoutes: MetadataRoute.Sitemap = (profiles || []).map((p) => ({
      url: `${baseUrl}/makers/${p.username}`,
      lastModified: p.created_at ? new Date(p.created_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    // Fetch public projects
    const { data: publicProjects } = await supabase
      .from('projects')
      .select('id, created_at')
      .eq('is_public', true)
      .limit(200);

    const projectRoutes: MetadataRoute.Sitemap = (publicProjects || []).map((proj) => ({
      url: `${baseUrl}/projects/${proj.id}`,
      lastModified: proj.created_at ? new Date(proj.created_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...profileRoutes, ...projectRoutes];
  } catch (err) {
    console.error('Failed to generate dynamic sitemap:', err);
    return staticRoutes;
  }
}
