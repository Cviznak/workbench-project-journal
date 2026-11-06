import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // If env vars are not yet configured (e.g. before user inputs credentials), allow unhindered access
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth') ||
    path.startsWith('/verify-email');
  const isSuspendedPage = path === '/suspended';
  const isVerifyEmailPage = path.startsWith('/verify-email');
  const isPublicPage =
    path === '/' ||
    path === '/tools' ||
    path.startsWith('/tools/') ||
    path === '/community' ||
    path.startsWith('/community/') ||
    path.startsWith('/makers/') ||
    path.startsWith('/projects/') ||
    path.startsWith('/api/') ||
    path.startsWith('/opengraph-image') ||
    path === '/robots.txt' ||
    path === '/sitemap.xml';

  if (user) {
    // If user has an active session but email is unconfirmed, route to /verify-email
    if (!user.email_confirmed_at && !isVerifyEmailPage && !path.startsWith('/auth')) {
      const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : '';
      return NextResponse.redirect(new URL(`/verify-email${emailParam}`, request.url));
    }

    // If logged in with confirmed email and hitting auth pages, redirect to dashboard
    if (user.email_confirmed_at && isAuthPage && !path.startsWith('/auth/callback')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Role check for /admin or state check for /suspended
    if (path.startsWith('/admin') || isSuspendedPage) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_suspended, role')
        .eq('id', user.id)
        .single();

      if (profile?.is_suspended && !isSuspendedPage) {
        return NextResponse.redirect(new URL('/suspended', request.url));
      }

      if (!profile?.is_suspended && isSuspendedPage) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      if (path.startsWith('/admin') && profile?.role !== 'ROOT_ADMIN' && profile?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  } else {
    // Unauthenticated user trying to access protected route
    if (!isAuthPage && !isSuspendedPage && !isPublicPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}
