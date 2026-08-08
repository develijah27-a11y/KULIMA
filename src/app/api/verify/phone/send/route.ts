import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { hashPin } from '@/lib/wallet-pin';
import { sendSms } from '@/lib/sms';
import { rateLimit } from '@/lib/rate-limit';

// Normalizes to the same local 0XXXXXXXXX form used everywhere else this
// app matches on phone_number (see create-profile/route.ts's group
// auto-sync match) — a verified number needs to match that format for the
// group-matching to actually work, which is the whole point of this flow.
function normalizeLocal(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/^\+256/, '0').replace(/^256/, '0');
}

function toE164(local: string): string {
  return local.startsWith('0') ? `+256${local.slice(1)}` : local;
}

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes — short deliberately (see /api/auth/forgot-password for the same reasoning on link expiry)

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phoneNumber } = await req.json().catch(() => ({ phoneNumber: null }));
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }
  const local = normalizeLocal(phoneNumber);
  if (!/^0\d{9}$/.test(local)) {
    return NextResponse.json({ error: 'Enter a valid Uganda phone number (e.g. 0701234567)' }, { status: 400 });
  }

  // Per-user and per-number caps — a code every 60s, capped at 5/hour either way.
  const [byUser, byNumber] = await Promise.all([
    rateLimit(`phone-otp-send:user:${user.id}`, 5, 3600),
    rateLimit(`phone-otp-send:number:${local}`, 5, 3600),
  ]);
  if (!byUser || !byNumber) {
    return NextResponse.json({ error: 'Too many codes requested. Please wait a while and try again.' }, { status: 429 });
  }

  const admin = createServiceRoleClient();

  // 60s cooldown between sends for this user, independent of the hourly cap above.
  const { data: recent } = await (admin.from as any)('phone_verification_codes')
    .select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
    return NextResponse.json({ error: 'Please wait a minute before requesting another code.' }, { status: 429 });
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeHash = hashPin(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error: insertErr } = await (admin.from as any)('phone_verification_codes').insert({
    user_id: user.id,
    phone_number: local,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (insertErr) {
    console.error('[/api/verify/phone/send]', insertErr);
    return NextResponse.json({ error: 'Could not send code. Please try again.' }, { status: 500 });
  }

  await sendSms(toE164(local), `Your Cropify verification code is ${code}. It expires in 10 minutes. Never share this code with anyone.`);

  return NextResponse.json({ success: true });
}
