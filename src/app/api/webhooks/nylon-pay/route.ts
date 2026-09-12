import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/prime-pay';
import { logSystemEvent } from '@/lib/system-log';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get('primepay-signature') ??
    req.headers.get('PrimePay-Signature') ??
    req.headers.get('x-primepay-signature') ??
    req.headers.get('x-signature') ??
    req.headers.get('x-nylon-signature') ??
    req.headers.get('x-webhook-signature') ??
    '';

  const secret =
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.PRIMEPAY_WEBHOOK_SECRET ||
    process.env.NYLON_PAY_WEBHOOK_SECRET ||
    (process.env.NODE_ENV !== 'production' ? '3dddf1cafb39c06eba4b9460582a2cb8fb8881d5863fe4667910ef2d76175f52' : '');

  if (!secret) {
    console.error('[Payment Webhook] Webhook secret not configured on server');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!verifyWebhookSignature({ payload: rawBody, signature, secret })) {
    logSystemEvent({
      category: 'auth_failure',
      level: 'error',
      route: '/api/webhooks/nylon-pay',
      method: 'POST',
      message: 'Payment webhook signature mismatch or invalid timestamp',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const payload = body.payload || body.data || body;
  const rawTxId = body.transaction_id || body.transactionId || payload.transaction_id || payload.transactionId;
  const rawRef = payload.reference || body.reference || rawTxId;

  // Sanitize reference and transactionId to prevent PostgREST injection
  const reference = String(rawRef || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 100);
  const transactionId = String(rawTxId || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 100);

  if (!reference && !transactionId) return NextResponse.json({ received: true });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const lookupRef = transactionId || reference;
  const { data: momoReq } = await (admin.from as any)('mobile_money_requests')
    .select('id, user_id, amount, status, type, provider_ref')
    .or(`provider_ref.eq.${lookupRef},provider_ref.eq.${reference},id.eq.${reference}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!momoReq || momoReq.status === 'completed') return NextResponse.json({ received: true });

  const statusStr = (body.status || payload.status || '').toLowerCase();
  const isSuccess =
    statusStr === 'success' ||
    statusStr === 'successful' ||
    statusStr === 'completed' ||
    statusStr === 'transaction.successful' ||
    statusStr === 'charge.success';

  if (isSuccess && momoReq.type === 'deposit') {
    // SECURITY: Use momoReq.amount as authoritative source of truth.
    // If webhook reports an amount differing from what was initiated, reject/flag.
    const reportedAmount = payload.amount !== undefined ? Number(payload.amount) : null;
    if (reportedAmount !== null && Math.abs(reportedAmount - Number(momoReq.amount)) > 0.01) {
      logSystemEvent({
        category: 'auth_failure',
        level: 'error',
        route: '/api/webhooks/nylon-pay',
        method: 'POST',
        message: `Webhook deposit amount mismatch: reported ${reportedAmount} vs expected ${momoReq.amount}`,
        metadata: { reference, momoReqId: momoReq.id },
      });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    const amount = Number(momoReq.amount);

    let claimed = false;
    try {
      const { data: rpcClaimed, error: claimErr } = await (admin as any).rpc('claim_deposit', {
        p_request_id: momoReq.id,
        p_wallet_user_id: momoReq.user_id,
        p_amount: amount,
        p_reference: reference,
        p_description: `Mobile money deposit via ${payload.provider || payload.method || 'mobile money'}`,
        p_metadata: { provider_transaction_id: transactionId || payload.id, operator_tid: payload.operatorTid },
      });
      if (!claimErr && rpcClaimed) claimed = true;
    } catch {}

    if (!claimed) {
      const { data: updatedReq } = await (admin.from as any)('mobile_money_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', momoReq.id)
        .neq('status', 'completed')
        .select('id')
        .maybeSingle();

      if (updatedReq) {
        const { data: userWallet } = await (admin.from as any)('wallets').select('id, balance').eq('user_id', momoReq.user_id).single();
        if (userWallet) {
          await (admin.from as any)('wallets').update({
            balance: Number(userWallet.balance || 0) + amount,
            updated_at: new Date().toISOString(),
          }).eq('id', userWallet.id);

          await (admin.from as any)('wallet_transactions').insert({
            wallet_id: userWallet.id,
            user_id: momoReq.user_id,
            type: 'deposit',
            amount: amount,
            status: 'completed',
            reference: reference,
            description: `Mobile money deposit via ${payload.provider || payload.method || 'mobile money'}`,
            metadata: { provider_transaction_id: transactionId || payload.id, operator_tid: payload.operatorTid },
          });
        }
      }
    }
  }

  const safeProviderRef = String(momoReq.provider_ref || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 100);

  if (isSuccess && momoReq.type === 'withdrawal') {
    await Promise.all([
      (admin.from as any)('mobile_money_requests').update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', momoReq.id),
      (admin.from as any)('wallet_transactions').update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).or(`reference.eq.${reference},reference.eq.${transactionId},reference.eq.${safeProviderRef}`),
    ]);
  }

  const isFailure =
    statusStr === 'failed' ||
    statusStr === 'cancelled' ||
    statusStr === 'expired' ||
    statusStr === 'transaction.failed' ||
    statusStr === 'transaction.cancelled';

  if (isFailure && momoReq.type === 'withdrawal') {
    const { data: wallet } = await (admin.from as any)('wallets').select('id').eq('user_id', momoReq.user_id).single();
    if (wallet) {
      await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: momoReq.amount });
    }
    await Promise.all([
      (admin.from as any)('mobile_money_requests').update({
        status: 'failed',
        failure_reason: payload.message || body.message || 'Payout failed at network operator',
        updated_at: new Date().toISOString(),
      }).eq('id', momoReq.id),
      (admin.from as any)('wallet_transactions').update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      }).or(`reference.eq.${reference},reference.eq.${transactionId},reference.eq.${safeProviderRef}`),
    ]);

    logSystemEvent({
      category: 'failed_payment',
      level: 'error',
      route: '/api/webhooks/nylon-pay',
      method: 'POST',
      message: `Withdrawal payout failed: ${payload.message || body.message || 'Unknown network failure'}`,
      metadata: { reference, transactionId },
    });
  }

  if (isFailure && momoReq.type === 'deposit') {
    await (admin.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: payload.message || body.message || 'Deposit prompt was cancelled or declined',
      updated_at: new Date().toISOString(),
    }).eq('id', momoReq.id);
  }

  return NextResponse.json({ received: true });
}
