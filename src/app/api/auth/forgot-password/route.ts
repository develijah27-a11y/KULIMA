import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, resetPasswordEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

// Generates the recovery link ourselves via the admin API and emails it
// through our own sender (lib/email.ts / Resend) instead of relying on
// Supabase's own built-in reset email. Two reasons:
//   1. Supabase's default "Reset Password" template links to
//      `{{ .ConfirmationURL }}`, which isn't guaranteed to match this app's
//      PKCE-style /auth/confirm?token_hash=...&type=recovery&next=... route
//      unless the dashboard template was hand-edited to emit that exact
//      shape — if it wasn't, clicking the link in the email silently logs
//      the user in via Supabase's own implicit-flow session detection and
//      dumps them on /dashboard, never showing the "set a new password"
//      form at all.
//   2. The email itself should come from our own sender/branding, not an
//      address controlled by Supabase.
// Always returns the same generic response whether or not the account
// exists — the account-existence check happens here, server-side, but is
// never surfaced to the caller, so this endpoint can't be used to enumerate
// registered emails.
function getAppOrigin(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const origin = getAppOrigin(req);
  const { email } = await req.json().catch(() => ({ email: null }));

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Rate-limit with relaxed thresholds for testing & usability (10 attempts / 5 mins)
  const normalizedEmail = email.trim().toLowerCase();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`forgot-password:email:${normalizedEmail}`, 10, 300),
    rateLimit(`forgot-password:ip:${req.headers.get('x-forwarded-for') ?? 'unknown'}`, 25, 300),
  ]);
  if (!byEmail || !byIp) {
    console.warn(`[/api/auth/forgot-password] Rate limit reached for "${normalizedEmail}"`);
    return NextResponse.json({ success: true });
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
    });

    let resendDispatched = false;

    if (error) {
      console.warn(`[/api/auth/forgot-password] Supabase generateLink notice for "${normalizedEmail}":`, error.message);
    } else if (data?.properties?.hashed_token) {
      const resetUrl = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=${encodeURIComponent('/auth/reset-password')}`;
      const emailResult = await sendEmail(
        normalizedEmail,
        'Reset your Cropify password',
        resetPasswordEmail({ resetUrl, requestedAt: new Date().toISOString() }),
      );
      if (emailResult.success) {
        resendDispatched = true;
        console.log(`[/api/auth/forgot-password] Custom branded reset email dispatched via Resend to "${normalizedEmail}"`);
      } else {
        console.warn(`[/api/auth/forgot-password] Resend delivery unfulfilled for "${normalizedEmail}" (${emailResult.error?.message || (emailResult.skipped ? 'skipped' : 'failed')}). Triggering Supabase recovery fallback...`);
      }
    }

    // Secondary fallback: If custom Resend email was not sent, trigger Supabase built-in reset email
    if (!resendDispatched) {
      const { error: sbError } = await admin.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${origin}/auth/confirm?next=/auth/reset-password`,
      });
      if (sbError) {
        console.warn(`[/api/auth/forgot-password] Supabase resetPasswordForEmail notice for "${normalizedEmail}":`, sbError.message);
      } else {
        console.log(`[/api/auth/forgot-password] Supabase recovery email triggered successfully for "${normalizedEmail}"`);
      }
    }
  } catch (err) {
    console.error('[/api/auth/forgot-password] Exception during recovery dispatch:', err);
  }

  return NextResponse.json({ success: true });
}
