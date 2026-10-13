// ============================================================
// FINOVA — Route Protection & Session Proxy (Next.js 16)
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { safeReturnPath } from '@/lib/navigation';

// Public routes that unauthenticated visitors can always access
const PUBLIC_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/agreements',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/risk-disclosure',
  '/auth',
  '/api/market',
  '/api/instruments',
  '/api/news',
  '/api/research',
  '/learn',
  '/explore',
  '/news',
  '/reit',
  '/invit',
  '/bonds',
  '/ipo',
  '/demo',
  '/icon.svg',
  '/favicon.ico',
];

// Auth-only pages that logged-in users should be redirected away from
const AUTH_ONLY_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const { pathname, search } = request.nextUrl;
  const isPublic = pathname === '/' || PUBLIC_PREFIXES.some((prefix) => prefix !== '/' && (pathname === prefix || pathname.startsWith(prefix + '/')));

  // If Supabase credentials are not configured in local environment, allow preview mode
  if (!url || !anonKey || url.includes('placeholder') || url.includes('your_')) {
    if (isPublic) return supabaseResponse;
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname + search)}`, request.url));
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthOnly = AUTH_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
  const redirectWithSession = (target: URL) => {
    const response = NextResponse.redirect(target);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Cookie');
    return response;
  };
  if (!isPublic) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store');
    supabaseResponse.headers.set('Vary', 'Cookie');
  }

  // 1. Unauthenticated users attempting to access protected routes
  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = '';
    // Preserve intended destination safely
    const fullTarget = pathname + (search || '');
    if (fullTarget && fullTarget.startsWith('/') && !fullTarget.startsWith('//')) {
      redirectUrl.searchParams.set('next', fullTarget);
    }
    return redirectWithSession(redirectUrl);
  }

  // 2. Authenticated users attempting to access login or register
  if (user && isAuthOnly) {
    const nextParam = request.nextUrl.searchParams.get('next');
    return redirectWithSession(new URL(safeReturnPath(nextParam, '/dashboard'), request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
