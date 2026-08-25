import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { logSystemEvent } from '@/lib/system-log';
import { primepay } from '@/lib/prime-pay';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`deposit:${user.id}`, 8, 60))) {
    return NextResponse.json({ error: 'Too many deposit attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  const admin = createServiceRoleClient();
  const { amount, phone, provider } = await req.json();

  if (!amount || Number(amount) < 500) {
    return NextResponse.json({ error: 'Minimum deposit is UGX 500' }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }
  if (!['mtn', 'airtel'].includes(provider?.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid provider. Choose MTN or Airtel Money.' }, { status: 400 });
  }

  // Normalize phone to standard format
  const cleanDigits = phone.replace(/\D/g, '');
  const normalizedPhone = cleanDigits.startsWith('256')
    ? `+${cleanDigits}`
    : cleanDigits.startsWith('0')
    ? `+256${cleanDigits.slice(1)}`
    : `+256${cleanDigits}`;

  // Create mobile_money_request record
  const { data: momoReq, error: momoErr } = await (admin.from as any)('mobile_money_requests').insert({
    user_id: user.id,
    type: 'deposit',
    amount: Number(amount),
    phone: normalizedPhone,
    provider: provider.toLowerCase(),
    status: 'pending',
  }).select('id').single();

  if (momoErr) {
    return NextResponse.json({ error: 'Failed to initialize deposit request' }, { status: 500 });
  }

  try {
    const payment = await primepay.collectPayment({
      amount: Number(amount),
      currency: 'UGX',
      description: `Wallet deposit via ${provider.toUpperCase()}`,
      customer: { name: user.email ?? 'Cropify user', phoneNumber: normalizedPhone },
      provider: provider.toLowerCase(),
      method: 'mobileMoney',
    });

    // Store the payment provider reference
    await (admin.from as any)('mobile_money_requests').update({
      status: 'processing',
      provider_ref: payment.reference,
    }).eq('id', momoReq.id);

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      message: payment.message || `Payment prompt sent to ${normalizedPhone}. Please check your phone and enter your Mobile Money PIN to approve the deposit of UGX ${Number(amount).toLocaleString()}.`,
    });
  } catch (err) {
    await (admin.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: err instanceof Error ? err.message : 'PrimePay rejected the deposit request',
    }).eq('id', momoReq.id);

    logSystemEvent({
      category: 'failed_payment',
      level: 'warn',
      route: '/api/wallet/deposit',
      method: 'POST',
      userId: user.id,
      message: err instanceof Error ? `Deposit charge failed: ${err.message}` : 'Deposit charge failed',
      metadata: { amount, provider },
    });

    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to send Mobile Money prompt. Please verify your phone number.',
    }, { status: 400 });
  }
}
