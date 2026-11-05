import { type NextRequest } from 'next/server';
import { updateSession } from './src/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg
     * - PWA assets: manifest.json, sw.js, workbox-*, icons/
     * - Static asset files (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|manifest\\.json|manifest\\.webmanifest|sw\\.js|workbox-[a-zA-Z0-9]+\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
