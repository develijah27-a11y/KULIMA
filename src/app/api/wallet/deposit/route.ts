import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const FLW_BASE = 'https://api.flutterwave.com/v3';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`deposit:${user.id}`, 5, 60))) {
    return NextResponse.json({ error: 'Too many deposit attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  // wallets and mobile_money_requests only grant write access to
  // service_role — the user's own request can still create/see its own
  // rows, but every write here goes through the service-role client so a
  // client can never tamper with a pending deposit's amount before the
  // webhook confirms it.
  const admin = createServiceRoleClient();

  const { amount, phone, provider } = await req.json();

  if (!amount || amount < 500) return NextResponse.json({ error: 'Minimum deposit is UGX 500' }, { status: 400 });
  if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  if (!['mtn', 'airtel'].includes(provider)) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

  const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY;

  // ── Simulation mode for local testing only — never in production. Without
  // this guard, a missing/unset key in a deployed environment silently
  // credits real wallet balances with no payment ever taking place. ─────────
  if (!flwSecret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Payment service not configured. Mobile money deposits are not available yet.' }, { status: 503 });
    }

    // Directly credit the wallet — for dev/testing only
    const { data: wallet, error: wErr } = await (admin.from as any)('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (wErr || !wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

    await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: Number(amount) });
    await (admin.from as any)('wallet_transactions').insert({
      wallet_id:   wallet.id,
      user_id:     user.id,
      type:        'deposit',
      amount:      Number(amount),
      status:      'completed',
      description: `[TEST] Mobile money deposit via ${provider.toUpperCase()} — ${phone}`,
    });
    return NextResponse.json({ success: true, message: `[TEST MODE] UGX ${Number(amount).toLocaleString()} deposited directly. Add FLUTTERWAVE_SECRET_KEY for real mobile money.`, simulated: true });
  }

  const txRef = `kulima-dep-${user.id.slice(0, 8)}-${Date.now()}`;

  // Create mobile_money_request record first
  const { data: momoReq, error: momoErr } = await (admin.from as any)('mobile_money_requests').insert({
    user_id: user.id,
    type: 'deposit',
    amount,
    phone,
    provider,
    status: 'pending',
    flutterwave_ref: txRef,
  }).select('id').single();

  if (momoErr) return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });

  // Normalize phone to international format
  const normalizedPhone = phone.startsWith('+') ? phone : phone.startsWith('0') ? `+256${phone.slice(1)}` : `+256${phone}`;

  try {
    const flwRes = await fetch(`${FLW_BASE}/charges?type=mobile_money_uganda`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flwSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: normalizedPhone,
        amount,
        currency: 'UGX',
        email: user.email ?? 'user@kulima.app',
        tx_ref: txRef,
        network: provider.toUpperCase(),
      }),
    });

    const flwData = await flwRes.json();

    if (flwData.status !== 'success' && flwData.data?.status !== 'pending') {
      // Mark as failed
      await (admin.from as any)('mobile_money_requests').update({
        status: 'failed',
        failure_reason: flwData.message ?? 'Flutterwave charge failed',
      }).eq('id', momoReq.id);

      return NextResponse.json({ error: flwData.message ?? 'Payment initiation failed' }, { status: 400 });
    }

    // Update with flutterwave's transaction id if returned
    if (flwData.data?.id) {
      await (admin.from as any)('mobile_money_requests').update({
        status: 'processing',
        flutterwave_ref: String(flwData.data.id),
      }).eq('id', momoReq.id);
    }

    return NextResponse.json({ success: true, message: 'Payment prompt sent' });
  } catch (err) {
    await (admin.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: 'Network error contacting payment provider',
    }).eq('id', momoReq.id);

    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }
}
