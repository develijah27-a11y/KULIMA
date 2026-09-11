import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { hashPin } from '@/lib/wallet-pin';
import { sendSms } from '@/lib/sms';
import { rateLimit } from '@/lib/rate-limit';

// Supports both local Ugandan numbers (07XXXXXXXX / +256...) and international
// E.164 numbers (+254..., +1..., +44...) for global Cropify users.
function parsePhoneNumber(raw: string): { storedNumber: string; e164: string; isValid: boolean } {
  const clean = raw.trim().replace(/[\s\-\(\)]/g, '');
  // Uganda formats: 07..., +256..., 256...
  if (clean.startsWith('+256') || clean.startsWith('256') || /^0\d{9}$/.test(clean)) {
    const local = clean.replace(/^\+256/, '0').replace(/^256/, '0');
    const isValid = /^0\d{9}$/.test(local);
    return {
      storedNumber: local,
      e164: `+256${local.slice(1)}`,
      isValid,
    };
  }
  // International format: +1..., +254..., +44..., etc.
  const e164 = clean.startsWith('+') ? clean : `+${clean}`;
  const isValid = /^\+[1-9]\d{7,14}$/.test(e164);
  return {
    storedNumber: e164,
    e164,
    isValid,
  };
}

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phoneNumber } = await req.json().catch(() => ({ phoneNumber: null }));
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const parsed = parsePhoneNumber(phoneNumber);
  if (!parsed.isValid) {
    return NextResponse.json({
      error: 'Enter a valid phone number (e.g. 0701234567 or +254 700 000000)',
    }, { status: 400 });
  }

  // Per-user and per-number caps — a code every 60s, capped at 5/hour either way.
  const [byUser, byNumber] = await Promise.all([
    rateLimit(`phone-otp-send:user:${user.id}`, 5, 3600),
    rateLimit(`phone-otp-send:number:${parsed.storedNumber}`, 5, 3600),
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
    phone_number: parsed.storedNumber,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (insertErr) {
    console.error('[/api/verify/phone/send]', insertErr);
    return NextResponse.json({ error: 'Could not send code. Please try again.' }, { status: 500 });
  }

  const smsResult = await sendSms(parsed.e164, `Your Cropify verification code is ${code}. It expires in 10 minutes. Never share this code with anyone.`);

  // A code that's stored but never actually sent reads to the user as
  // "the app is broken" rather than "wait for the code" — surface real
  // delivery failures instead of always claiming success. `skipped` (SMS
  // not configured in this environment) still returns success since that's
  // an expected no-op, not a user-facing failure.
  if (smsResult.error) {
    return NextResponse.json({ error: 'Could not send the code by SMS right now. Please try again shortly.' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
