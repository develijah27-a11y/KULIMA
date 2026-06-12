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
    // Refresh token is invalid or expired — clear all stale Supabase auth
    // cookies so the browser stops sending them on every request.
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) response.cookies.delete(name);
    });
  }

  return { supabase, response, user };
}
