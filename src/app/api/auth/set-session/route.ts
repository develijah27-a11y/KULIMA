import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/config/env';

/**
 * POST /api/auth/set-session
 *
 * Called by the browser immediately after a successful client-side sign-in.
 * Receives the raw access + refresh tokens, sets the session on a server-side
 * Supabase client so that createServerClient's setAll() handler fires and
 * writes proper httpOnly Set-Cookie headers on the response.
 *
 * WHY setSession() ALONE IS NOT ENOUGH
 * ─────────────────────────────────────
 * supabase.auth.setSession() only calls setAll() when it issues NEW tokens
 * (e.g. the refresh token was rotated). When the tokens are still fresh
 * (just issued by signInWithPassword milliseconds ago), setSession() stores
 * them in memory but never triggers setAll(), so the response carries no
 * Set-Cookie headers and the middleware reads no session.
 *
 * THE FIX
 * ───────
 * After setSession() we call getUser(). getUser() always calls setAll()
 * with the current session, guaranteeing that Set-Cookie headers are
 * written to the response regardless of whether the tokens were rotated.
 */
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

    // Build the response before creating the client so setAll() can
    // attach cookies to it immediately when it fires.
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
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
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

    // Step 1: load the session into the client's in-memory store.
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    // Step 2: call getUser() — this is the call that ALWAYS triggers setAll()
    // and writes the httpOnly sb-* cookies to the response, regardless of
    // whether the tokens were rotated in step 1.
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: userError?.message ?? 'Could not validate session' },
        { status: 401 },
      );
    }

    // At this point, response.cookies contains valid httpOnly sb-* cookies.
    // Returning this response writes them to the browser's cookie jar.
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
