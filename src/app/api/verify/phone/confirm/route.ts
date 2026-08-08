import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyPin } from '@/lib/wallet-pin';
import { rateLimit } from '@/lib/rate-limit';
import { syncGroupMembershipByPhone } from '@/lib/group-sync';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json().catch(() => ({ code: null }));
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code' }, { status: 400 });
  }

  if (!(await rateLimit(`phone-otp-confirm:${user.id}`, 10, 600))) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a while and try again.' }, { status: 429 });
  }

  const admin = createServiceRoleClient();

  const { data: row } = await (admin.from as any)('phone_verification_codes')
    .select('id, phone_number, code_hash, attempts, expires_at, verified_at')
    .eq('user_id', user.id)
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: 'No pending code. Request a new one.' }, { status: 400 });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many wrong attempts. Request a new code.' }, { status: 400 });
  }

  const ok = verifyPin(code, row.code_hash);
  if (!ok) {
    await (admin.from as any)('phone_verification_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: profile } = await (admin.from as any)('profiles').select('id').eq('user_id', user.id).single();
  await Promise.all([
    (admin.from as any)('phone_verification_codes').update({ verified_at: now }).eq('id', row.id),
    (admin.from as any)('profiles').update({ phone_verified: true, phone_number: row.phone_number }).eq('user_id', user.id),
  ]);

  // Retry the group auto-sync match now that this number is confirmed —
  // catches anyone the signup-time (unverified) match missed.
  if (profile) {
    await syncGroupMembershipByPhone(admin, user.id, profile.id, row.phone_number).catch((err) => {
      console.error('[/api/verify/phone/confirm] group sync error:', err);
    });
  }

  return NextResponse.json({ success: true, phoneNumber: row.phone_number });
}
