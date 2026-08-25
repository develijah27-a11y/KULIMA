import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';
import { verifyPin, isValidPinFormat } from '@/lib/wallet-pin';
import { logSystemEvent } from '@/lib/system-log';
import { primepay } from '@/lib/prime-pay';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`withdraw:${user.id}`, 5, 60))) {
    return NextResponse.json({ error: 'Too many withdrawal attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  const { amount, phone, provider, pin } = await req.json();

  if (!amount || Number(amount) < 500) return NextResponse.json({ error: 'Minimum withdrawal is UGX 500' }, { status: 400 });
  if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  if (!['mtn', 'airtel'].includes(provider?.toLowerCase())) return NextResponse.json({ error: 'Invalid provider. Choose MTN or Airtel Money.' }, { status: 400 });

  const serviceUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Use service role to check + deduct balance atomically
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: wallet, error: walletErr } = await (admin.from as any)('wallets')
    .select('id, balance, is_frozen, pin_hash')
    .eq('user_id', user.id)
    .single();

  if (walletErr || !wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  if (wallet.is_frozen) return NextResponse.json({ error: 'This wallet is frozen pending review. Contact support for assistance.' }, { status: 403 });

  if (!wallet.pin_hash) {
    return NextResponse.json({ error: 'Set up your wallet PIN before withdrawing.', code: 'PIN_NOT_SET' }, { status: 403 });
  }
  if (!(await rateLimit(`wallet-pin-verify:${user.id}`, 5, 300))) {
    return NextResponse.json({ error: 'Too many incorrect PIN attempts. Please wait a few minutes.' }, { status: 429 });
  }
  if (!isValidPinFormat(pin) || !verifyPin(pin, wallet.pin_hash)) {
    logSystemEvent({
      category: 'auth_failure',
      level: 'warn',
      route: '/api/wallet/withdraw',
      method: 'POST',
      userId: user.id,
      message: 'Incorrect wallet PIN on withdraw attempt',
    });
    return NextResponse.json({ error: 'Incorrect PIN', code: 'PIN_INCORRECT' }, { status: 403 });
  }

  if (wallet.balance < Number(amount)) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  // Deduct balance upfront
  const { error: deductErr } = await (admin as any).rpc('debit_wallet', {
    p_wallet_id: wallet.id,
    p_amount: Number(amount),
  });
  if (deductErr) {
    return NextResponse.json({ error: 'Failed to process balance deduction' }, { status: 500 });
  }

  const cleanDigits = phone.replace(/\D/g, '');
  const normalizedPhone = cleanDigits.startsWith('256')
    ? `+${cleanDigits}`
    : cleanDigits.startsWith('0')
    ? `+256${cleanDigits.slice(1)}`
    : `+256${cleanDigits}`;

  const [momoInsert, txnInsert] = await Promise.all([
    (admin.from as any)('mobile_money_requests').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: Number(amount),
      phone: normalizedPhone,
      provider: provider.toLowerCase(),
      status: 'pending',
    }).select('id').single(),
    (admin.from as any)('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: user.id,
      type: 'withdrawal',
      amount: Number(amount),
      status: 'pending',
      description: `Mobile money withdrawal via ${provider.toUpperCase()} — ${phone}`,
    }).select('id').single(),
  ]);

  if (momoInsert.error || txnInsert.error) {
    await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: Number(amount) });
    return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
  }

  try {
    const payout = await primepay.makePayout({
      amount: Number(amount),
      currency: 'UGX',
      description: 'Cropify Pay withdrawal',
      customer: { name: user.email ?? 'Cropify user', phoneNumber: normalizedPhone },
      destination: { accountHolderName: user.email ?? 'Cropify user', accountNumber: normalizedPhone },
    });

    await Promise.all([
      (admin.from as any)('mobile_money_requests').update({
        status: 'processing',
        provider_ref: payout.reference,
      }).eq('id', momoInsert.data.id),
      (admin.from as any)('wallet_transactions').update({
        reference: payout.reference,
      }).eq('id', txnInsert.data.id),
    ]);

    return NextResponse.json({
      success: true,
      reference: payout.reference,
      message: payout.message || `Withdrawal of UGX ${Number(amount).toLocaleString()} initiated to ${normalizedPhone}. Funds will arrive shortly.`,
    });
  } catch (err) {
    await Promise.all([
      (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: Number(amount) }),
      (admin.from as any)('wallet_transactions').update({ status: 'failed' }).eq('id', txnInsert.data.id),
      (admin.from as any)('mobile_money_requests').update({
        status: 'failed',
        failure_reason: err instanceof Error ? err.message : 'PrimePay rejected the withdrawal request',
      }).eq('id', momoInsert.data.id),
    ]);
    logSystemEvent({
      category: 'failed_payment',
      level: 'warn',
      route: '/api/wallet/withdraw',
      method: 'POST',
      userId: user.id,
      message: err instanceof Error ? `Withdrawal payout failed: ${err.message}` : 'Withdrawal payout failed',
      metadata: { amount, provider },
    });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Transfer failed' }, { status: 400 });
  }
}
