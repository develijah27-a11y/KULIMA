import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

const PROTECTED = [
  '/dashboard', '/onboarding', '/farmer', '/buyer', '/admin', '/transporter',
  '/supplier', '/pathologist', '/offtaker', '/groups',
  '/farms', '/soil', '/disease', '/weather',
];

// Routes where we redirect logged-in users away
const AUTH_ONLY = ['/auth/signin'];

export async function middleware(request: NextRequest) {
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
