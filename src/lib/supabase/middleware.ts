import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/config/env';

export async function createClient(request: NextRequest) {
  // Start with an unmodified passthrough response.
  // The setAll handler below will REPLACE this with a new response
  // that carries the refreshed auth cookies back to the browser.
  let response = NextResponse.next({ request });

  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey,
    {
      cookies: {
        // Read all cookies from the incoming request
        getAll() {
          return request.cookies.getAll();
        },
        // Write refreshed session cookies to BOTH request and response.
        // Without writing to the response the browser never gets the new
        // access token and every server render sees an expired/null session.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Calling getUser() triggers a token refresh when the access token is
  // close to expiry — this is what writes the new cookies via setAll above.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Network failure reaching Supabase — do NOT delete cookies.
    // Deleting valid sb-* cookies on a transient network error would
    // sign out a legitimately authenticated user. Return user=null so
    // the middleware treats this request as unauthenticated for routing
    // purposes, but the cookies stay intact for the next request.
    // The browser will retry and the session will be recognised again.
    console.warn('[middleware] getUser() failed — treating as unauthenticated without clearing cookies');
  }

  return { supabase, response, user };
}
