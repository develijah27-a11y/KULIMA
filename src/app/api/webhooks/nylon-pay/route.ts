import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@nile-squad/nylonpay-ts';
import { logSystemEvent } from '@/lib/system-log';

export async function POST(req: Request) {
  // Signature verification needs the raw bytes, not parsed JSON — parsing
  // first and re-serializing could change the signed content.
  const rawBody = await req.text();
  const signature = req.headers.get('x-nylon-signature') ?? '';
  const secret = process.env.NYLON_PAY_WEBHOOK_SECRET;

  if (!secret || !verifyWebhookSignature({ payload: rawBody, signature, secret })) {
    logSystemEvent({
      category: 'auth_failure',
      level: 'error',
      route: '/api/webhooks/nylon-pay',
      method: 'POST',
      message: secret ? 'Nylon Pay webhook signature mismatch' : 'NYLON_PAY_WEBHOOK_SECRET not configured',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const event = body.event as string;
  const payload = body.payload ?? {};
  const reference = payload.reference as string | undefined;

  if (!reference) return NextResponse.json({ received: true });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: momoReq } = await (admin.from as any)('mobile_money_requests')
    .select('id, user_id, amount, status, type')
    .eq('provider_ref', reference)
    .maybeSingle();

  if (!momoReq || momoReq.status === 'completed') return NextResponse.json({ received: true });

  if (event === 'transaction.successful' && momoReq.type === 'deposit') {
    // Credit the amount Nylon Pay actually reports as charged, not the
    // amount the client originally requested — the request row is user-
    // writable in principle, so trusting it would let a small real payment
    // be inflated into a large wallet credit.
    const amount = Number(payload.amount ?? momoReq.amount);

    // Atomic claim: UPDATE ... WHERE status <> 'completed' takes a row lock,
    // so a retried/duplicated webhook delivery for the same request loses
    // the race and credits nothing the second time.
    const { data: claimed } = await (admin as any).rpc('claim_deposit', {
      p_request_id: momoReq.id,
      p_wallet_user_id: momoReq.user_id,
      p_amount: amount,
      p_reference: reference,
      p_description: `Mobile money deposit via ${payload.method ?? 'mobile money'}`,
      p_metadata: { nylon_transaction_id: payload.transactionId, operator_tid: payload.operatorTid },
    });
    if (!claimed) return NextResponse.json({ received: true });
  }

  if (event === 'transaction.successful' && momoReq.type === 'withdrawal') {
    await Promise.all([
      (admin.from as any)('mobile_money_requests').update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', momoReq.id),
      (admin.from as any)('wallet_transactions').update({ status: 'completed' }).eq('reference', reference),
    ]);
  }

  if ((event === 'transaction.failed' || event === 'transaction.cancelled') && momoReq.type === 'withdrawal') {
    const { data: wallet } = await (admin.from as any)('wallets').select('id').eq('user_id', momoReq.user_id).single();
    if (wallet) {
      await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: momoReq.amount });
    }
    await Promise.all([
      (admin.from as any)('mobile_money_requests').update({
        status: 'failed',
        failure_reason: payload.failureReason ?? 'Payout failed',
        updated_at: new Date().toISOString(),
      }).eq('id', momoReq.id),
      (admin.from as any)('wallet_transactions').update({ status: 'failed' }).eq('reference', reference),
    ]);

    logSystemEvent({
      category: 'failed_payment',
      level: 'error',
      route: '/api/webhooks/nylon-pay',
      method: 'POST',
      message: `Withdrawal payout reported ${event === 'transaction.cancelled' ? 'cancelled' : 'failed'} by Nylon Pay: ${payload.failureReason ?? event}`,
      metadata: { reference },
    });
  }

  if ((event === 'transaction.failed' || event === 'transaction.cancelled') && momoReq.type === 'deposit') {
    await (admin.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: payload.failureReason ?? 'Deposit failed',
      updated_at: new Date().toISOString(),
    }).eq('id', momoReq.id);
  }

  return NextResponse.json({ received: true });
}
