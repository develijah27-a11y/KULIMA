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

  const numAmount = Number(amount);
  const currentBalance = Number(wallet.balance || 0);

  if (currentBalance < numAmount) {
    return NextResponse.json({
      error: `Insufficient balance. Available balance: UGX ${currentBalance.toLocaleString()}`,
    }, { status: 400 });
  }

  // Deduct balance upfront atomically
  let debited = false;

  // 1. Try claim_wallet_debit RPC
  try {
    const { data: claimResult, error: claimErr } = await (admin as any).rpc('claim_wallet_debit', {
      p_wallet_id: wallet.id,
      p_amount: numAmount,
    });
    if (!claimErr && claimResult) {
      debited = true;
    }
  } catch {}

  // 2. Try debit_wallet RPC alias if not debited
  if (!debited) {
    try {
      const { data: aliasResult, error: aliasErr } = await (admin as any).rpc('debit_wallet', {
        p_wallet_id: wallet.id,
        p_amount: numAmount,
      });
      if (!aliasErr && aliasResult) {
        debited = true;
      }
    } catch {}
  }

  // 3. Fallback to direct atomic service-role update (guarantees success even if DB migration is pending)
  if (!debited) {
    const { data: directUpdated, error: directErr } = await (admin.from as any)('wallets')
      .update({
        balance: currentBalance - numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)
      .gte('balance', numAmount)
      .select('id, balance')
      .maybeSingle();

    if (!directErr && directUpdated) {
      debited = true;
    }
  }

  if (!debited) {
    logSystemEvent({
      category: 'failed_payment',
      level: 'warn',
      route: '/api/wallet/withdraw',
      method: 'POST',
      userId: user.id,
      message: 'Failed to process balance deduction',
      metadata: { amount: numAmount, walletId: wallet.id, balance: currentBalance },
    });
    return NextResponse.json({
      error: 'Failed to process balance deduction. Please check your available balance and try again.',
    }, { status: 400 });
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
      amount: numAmount,
      phone: normalizedPhone,
      provider: provider.toLowerCase(),
      status: 'pending',
    }).select('id').single(),
    (admin.from as any)('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: user.id,
      type: 'withdrawal',
      amount: numAmount,
      status: 'pending',
      description: `Mobile money withdrawal via ${provider.toUpperCase()} — ${normalizedPhone}`,
    }).select('id').single(),
  ]);

  if (momoInsert.error || txnInsert.error) {
    // Restore balance if record insertion failed
    const { error: refundErr } = await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: numAmount });
    if (refundErr) {
      await (admin.from as any)('wallets').update({ balance: currentBalance }).eq('id', wallet.id);
    }
    return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
  }

  try {
    const payout = await primepay.makePayout({
      amount: numAmount,
      currency: 'UGX',
      description: 'Cropify Pay withdrawal',
      customer: { name: user.email ?? 'Cropify user', phoneNumber: normalizedPhone },
      destination: { accountHolderName: user.email ?? 'Cropify user', accountNumber: normalizedPhone },
    });

    await Promise.all([
      (admin.from as any)('mobile_money_requests').update({
        status: 'processing',
        provider_ref: payout.reference,
        updated_at: new Date().toISOString(),
      }).eq('id', momoInsert.data.id),
      (admin.from as any)('wallet_transactions').update({
        reference: payout.reference,
        status: 'processing',
        updated_at: new Date().toISOString(),
      }).eq('id', txnInsert.data.id),
    ]);

    return NextResponse.json({
      success: true,
      reference: payout.reference,
      message: payout.message || `Withdrawal of UGX ${numAmount.toLocaleString()} initiated to ${normalizedPhone}. Funds will arrive shortly.`,
    });
  } catch (err) {
    // Restore balance on payout error
    const { error: refundErr } = await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: numAmount });
    if (refundErr) {
      await (admin.from as any)('wallets').update({ balance: currentBalance }).eq('id', wallet.id);
    }
    await Promise.all([
      (admin.from as any)('wallet_transactions').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', txnInsert.data.id),
      (admin.from as any)('mobile_money_requests').update({
        status: 'failed',
        failure_reason: err instanceof Error ? err.message : 'PrimePay rejected the withdrawal request',
        updated_at: new Date().toISOString(),
      }).eq('id', momoInsert.data.id),
    ]);
    logSystemEvent({
      category: 'failed_payment',
      level: 'warn',
      route: '/api/wallet/withdraw',
      method: 'POST',
      userId: user.id,
      message: err instanceof Error ? `Withdrawal payout failed: ${err.message}` : 'Withdrawal payout failed',
      metadata: { amount: numAmount, provider },
    });
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Withdrawal transfer could not be completed. Your wallet balance has been restored.',
    }, { status: 400 });
  }
}
