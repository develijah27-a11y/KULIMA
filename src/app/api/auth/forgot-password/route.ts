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
export async function POST(req: Request) {
  const { origin } = new URL(req.url);
  const { email } = await req.json().catch(() => ({ email: null }));

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Rate-limit by the submitted email (not just IP) so one address can't be
  // hammered with reset emails from a rotating set of IPs, and one IP can't
  // spam a large set of addresses either — cap both.
  const normalizedEmail = email.trim().toLowerCase();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`forgot-password:email:${normalizedEmail}`, 3, 900),
    rateLimit(`forgot-password:ip:${req.headers.get('x-forwarded-for') ?? 'unknown'}`, 10, 900),
  ]);
  if (!byEmail || !byIp) {
    // Still generic — don't reveal that rate limiting (vs. account
    // non-existence) is why nothing happens this time.
    return NextResponse.json({ success: true });
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
    });

    // A missing/invalid account surfaces here as an error (e.g. "User not
    // found") — swallow it and fall through to the same generic success
    // response as the real-account path below.
    if (!error && data?.properties?.hashed_token) {
      const resetUrl = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=${encodeURIComponent('/auth/reset-password')}`;
      await sendEmail(
        normalizedEmail,
        'Reset your Cropify password',
        resetPasswordEmail({ resetUrl, requestedAt: new Date().toISOString() }),
      );
    }
  } catch (err) {
    console.error('[/api/auth/forgot-password]', err);
    // Fall through — never let a server-side error leak account existence
    // or turn into a distinguishable response for the caller.
  }

  return NextResponse.json({ success: true });
}
