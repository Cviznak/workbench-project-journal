import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/tools', '/community', '/community/', '/makers', '/makers/', '/projects/'],
      disallow: [
        '/admin',
        '/settings',
        '/workspace',
        '/inventory',
        '/skills',
        '/api/',
        '/auth/',
        '/verify-email',
        '/suspended',
      ],
    },
    sitemap: 'https://www.workbenchsoc.com/sitemap.xml',
  };
}
