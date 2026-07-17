import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { hashPin, verifyPin, isValidPinFormat } from '@/lib/wallet-pin';
import { rateLimit } from '@/lib/rate-limit';

// GET: whether this wallet already has a PIN set (so the UI knows to show
// "Set up your PIN" vs "Change your PIN").
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: wallet } = await (supabase.from as any)('wallets').select('pin_hash').eq('user_id', user.id).single();
  return NextResponse.json({ hasPin: !!(wallet as any)?.pin_hash });
}

// POST: set the PIN for the first time, or change it (requires currentPin).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`wallet-pin-set:${user.id}`, 5, 300))) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }

  const { pin, currentPin } = await req.json().catch(() => ({}));
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: wallet, error: fetchErr } = await (admin.from as any)('wallets')
    .select('id, pin_hash').eq('user_id', user.id).single();
  if (fetchErr || !wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

  if (wallet.pin_hash) {
    if (!currentPin || !verifyPin(currentPin, wallet.pin_hash)) {
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 403 });
    }
  }

  const { error } = await (admin.from as any)('wallets')
    .update({ pin_hash: hashPin(pin), pin_set_at: new Date().toISOString() })
    .eq('id', wallet.id);
  if (error) {
    console.error('[/api/wallet/pin]', error);
    return NextResponse.json({ error: 'Failed to save PIN. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
