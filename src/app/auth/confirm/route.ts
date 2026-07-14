import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/config/env';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

  const response = NextResponse.redirect(new URL(next, origin));

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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // First time this account is confirmed: create the profile row now. With
  // email confirmation required, there's no session right after signUp() for
  // the client to call /api/auth/create-profile with — this is the first
  // point the user is actually authenticated, so it happens here instead.
  // full_name/phone_number/location were captured in auth user_metadata at
  // signUp() time specifically so they'd survive to this point.
  if ((type === 'signup' || type === 'email') && data.user) {
    const meta = data.user.user_metadata ?? {};
    const admin = createServiceRoleClient();
    await admin.from('profiles').upsert(
      {
        user_id:      data.user.id,
        full_name:    meta.full_name || data.user.email?.split('@')[0] || 'User',
        phone_number: meta.phone_number ?? null,
        location:     meta.location ?? null,
        role:         'pending',
        roles:        ['pending'],
      },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  }

  // verifyOtp set auth cookies on response — redirect to dashboard (or next param)
  return response;
}
