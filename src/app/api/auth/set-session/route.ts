import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/config/env';

// Called by the browser immediately after a successful client-side sign-in
// (signInWithPassword, verifyOtp, etc.).
//
// WHY THIS EXISTS
// ───────────────
// createBrowserClient (@supabase/ssr) writes the Supabase session to
// document.cookie as a non-httpOnly, client-accessible cookie.  The
// middleware (src/proxy.ts) uses createServerClient which looks for the
// same sb-* cookie names — but on desktop browsers the cookie written by
// the client is sometimes not sent on the very next navigation request
// because the browser hasn't yet flushed it to its cookie jar before the
// new HTTP request fires (race condition between JS microtask queue and
// the browser network stack).
//
// This route fixes the race by doing the authoritative cookie write
// server-side: the client POSTs its access + refresh tokens here, the
// server calls supabase.auth.setSession() which triggers createServerClient's
// setAll() handler, and the response carries proper Set-Cookie headers back
// to the browser.  By the time the browser receives the 200, the httpOnly
// sb-* cookies are committed to the cookie jar — and the subsequent
// navigation to /dashboard arrives at the middleware with them already set.

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'access_token and refresh_token are required' },
        { status: 400 },
      );
    }

    const anonKey =
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) ??
      '';

    // Build the response first so the cookie handler can attach Set-Cookie
    // headers to it — same pattern as src/app/auth/confirm/route.ts.
    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Write every refreshed sb-* cookie onto the outgoing response so
            // the browser stores them as server-set httpOnly cookies.
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                // Guarantee httpOnly so these cookies survive cross-tab
                // navigation and are invisible to client JS (XSS protection).
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
              }),
            );
          },
        },
      },
    );

    // setSession() exchanges the tokens for a validated session and triggers
    // the setAll() handler above, writing Set-Cookie headers on the response.
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
