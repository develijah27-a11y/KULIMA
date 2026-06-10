import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/config/env';

// Handles Supabase PKCE email confirmation links:
// /auth/confirm?token_hash=<hash>&type=signup  (new account)
// /auth/confirm?token_hash=<hash>&type=recovery (password reset)
// /auth/confirm?token_hash=<hash>&type=magiclink
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'magiclink' | 'email' | null;
  const next = searchParams.get('next') ?? '/dashboard';

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(`/auth/signin?error=missing_token`, origin)
    );
  }

  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) ??
    '';

  const cookieStore: Record<string, string> = {};

  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // verifyOtp set auth cookies on response — redirect to dashboard (or next param)
  return response;
}
