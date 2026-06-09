import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FLW_BASE = 'https://api.flutterwave.com/v3';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, phone, provider } = await req.json();

  if (!amount || amount < 500) return NextResponse.json({ error: 'Minimum deposit is UGX 500' }, { status: 400 });
  if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  if (!['mtn', 'airtel'].includes(provider)) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

  const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!flwSecret) return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 });

  const txRef = `kulima-dep-${user.id.slice(0, 8)}-${Date.now()}`;

  // Create mobile_money_request record first
  const { data: momoReq, error: momoErr } = await (supabase.from as any)('mobile_money_requests').insert({
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
      await (supabase.from as any)('mobile_money_requests').update({
        status: 'failed',
        failure_reason: flwData.message ?? 'Flutterwave charge failed',
      }).eq('id', momoReq.id);

      return NextResponse.json({ error: flwData.message ?? 'Payment initiation failed' }, { status: 400 });
    }

    // Update with flutterwave's transaction id if returned
    if (flwData.data?.id) {
      await (supabase.from as any)('mobile_money_requests').update({
        status: 'processing',
        flutterwave_ref: String(flwData.data.id),
      }).eq('id', momoReq.id);
    }

    return NextResponse.json({ success: true, message: 'Payment prompt sent' });
  } catch (err) {
    await (supabase.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: 'Network error contacting payment provider',
    }).eq('id', momoReq.id);

    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }
}
