import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/config/env';

export async function POST(request: NextRequest) {
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);

  // Revoke the refresh token at Supabase (server-side)
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });
  await supabase.auth.signOut();

  // Return success and expire every sb-* cookie the browser holds
  const response = NextResponse.json({ ok: true });
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  });

  return response;
}
