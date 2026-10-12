// ============================================================
// FINOVA — Route Protection & Session Proxy (Next.js 16)
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  '/learn',
  '/explore',
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

  // If Supabase credentials are not configured in local environment, allow preview mode
  if (!url || !anonKey || url.includes('placeholder') || url.includes('your_')) {
    return supabaseResponse;
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

  const { pathname, search } = request.nextUrl;

  const isExactRoot = pathname === '/';
  const isPublic = isExactRoot || PUBLIC_PREFIXES.some((prefix) =>
    prefix === '/' ? false : pathname.startsWith(prefix)
  );
  const isAuthOnly = AUTH_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));

  // 1. Unauthenticated users attempting to access protected routes
  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    // Preserve intended destination safely
    const fullTarget = pathname + (search || '');
    if (fullTarget && fullTarget.startsWith('/') && !fullTarget.startsWith('//')) {
      redirectUrl.searchParams.set('next', fullTarget);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Authenticated users attempting to access login or register
  if (user && isAuthOnly) {
    const nextParam = request.nextUrl.searchParams.get('next');
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.delete('next');

    // Validate next redirect to prevent open-redirect vulnerabilities
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      redirectUrl.pathname = nextParam;
    } else {
      redirectUrl.pathname = '/dashboard';
    }
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
