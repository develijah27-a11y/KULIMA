import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

const PROTECTED = [
  '/dashboard', '/onboarding', '/farmer', '/buyer', '/admin', '/transporter',
  '/supplier', '/pathologist', '/offtaker', '/groups',
  '/farms', '/soil', '/disease', '/weather',
];

// Routes where we redirect logged-in users away
const AUTH_ONLY = ['/auth/signin'];

// Sessions expire after 12 hours regardless of Supabase's own token lifetime.
// The agrinova_sess cookie records when the session was first stamped.
const SESSION_COOKIE = 'agrinova_sess';
const SESSION_MAX_MS  = 12 * 60 * 60 * 1000; // 12 hours
const PROD = process.env.NODE_ENV === 'production';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED.some(r => pathname.startsWith(r));
  const isAuthOnly  = AUTH_ONLY.some(r => pathname === r);

  // Public routes (landing, /auth/signup, static pages):
  // skip Supabase entirely — no cookie refresh needed for unauthenticated pages.
  if (!isProtected && !isAuthOnly) {
    return NextResponse.next({ request });
  }

  // createClient refreshes the session and returns a response with updated cookies
  const { response, user } = await createClient(request);

  // ── Session-age enforcement ─────────────────────────────────────────────
  if (user && isProtected) {
    const sessVal = request.cookies.get(SESSION_COOKIE)?.value;
    if (sessVal) {
      const ageMs = Date.now() - parseInt(sessVal, 10);
      if (ageMs > SESSION_MAX_MS) {
        // Session is too old — clear all auth state and require fresh sign-in
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('reason', 'session_expired');
        const expired = NextResponse.redirect(signInUrl);
        request.cookies.getAll().forEach(({ name }) => {
          if (name.startsWith('sb-') || name === SESSION_COOKIE) {
            expired.cookies.set(name, '', {
              path: '/', maxAge: 0, httpOnly: true,
              sameSite: 'lax', secure: PROD,
            });
          }
        });
        return expired;
      }
    } else {
      // First protected-route hit for this session — stamp the start time
      response.cookies.set(SESSION_COOKIE, String(Date.now()), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: PROD,
        maxAge: Math.round(SESSION_MAX_MS / 1000) + 3600,
      });
    }
  }
  // ───────────────────────────────────────────────────────────────────────

  if (isProtected && !user) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirectRes = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie as any);
    });
    return redirectRes;
  }

  // Redirect logged-in users away from /auth/signin only
  if (user && isAuthOnly) {
    const redirectRes = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie as any);
    });
    return redirectRes;
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
