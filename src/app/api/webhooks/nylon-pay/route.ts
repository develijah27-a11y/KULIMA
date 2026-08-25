import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/prime-pay';
import { logSystemEvent } from '@/lib/system-log';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get('x-primepay-signature') ??
    req.headers.get('x-signature') ??
    req.headers.get('x-nylon-signature') ??
    req.headers.get('x-webhook-signature') ??
    '';

  const secret =
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.PRIMEPAY_WEBHOOK_SECRET ||
    process.env.NYLON_PAY_WEBHOOK_SECRET ||
    '3dddf1cafb39c06eba4b9460582a2cb8fb8881d5863fe4667910ef2d76175f52';

  if (!verifyWebhookSignature({ payload: rawBody, signature, secret })) {
    logSystemEvent({
      category: 'auth_failure',
      level: 'error',
      route: '/api/webhooks/prime-pay',
      method: 'POST',
      message: 'Payment webhook signature mismatch',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const event = body.event || body.type || (body.status === 'successful' ? 'transaction.successful' : 'unknown');
  const payload = body.payload || body.data || body;
  const reference = payload.reference || body.reference;

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

  const isSuccess =
    event === 'transaction.successful' ||
    event === 'charge.success' ||
    payload.status === 'successful' ||
    payload.status === 'completed';

  if (isSuccess && momoReq.type === 'deposit') {
    const amount = Number(payload.amount ?? momoReq.amount);

    const { data: claimed } = await (admin as any).rpc('claim_deposit', {
      p_request_id: momoReq.id,
      p_wallet_user_id: momoReq.user_id,
      p_amount: amount,
      p_reference: reference,
      p_description: `Mobile money deposit via ${payload.provider || payload.method || 'mobile money'}`,
      p_metadata: { provider_transaction_id: payload.transactionId || payload.id, operator_tid: payload.operatorTid },
    });
    if (!claimed) return NextResponse.json({ received: true });
  }

  if (isSuccess && momoReq.type === 'withdrawal') {
    await Promise.all([
      (admin.from as any)('mobile_money_requests').update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', momoReq.id),
      (admin.from as any)('wallet_transactions').update({ status: 'completed' }).eq('reference', reference),
    ]);
  }

  const isFailure =
    event === 'transaction.failed' ||
    event === 'transaction.cancelled' ||
    payload.status === 'failed' ||
    payload.status === 'cancelled';

  if (isFailure && momoReq.type === 'withdrawal') {
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
      route: '/api/webhooks/prime-pay',
      method: 'POST',
      message: `Withdrawal payout failed: ${payload.failureReason ?? event}`,
      metadata: { reference },
    });
  }

  if (isFailure && momoReq.type === 'deposit') {
    await (admin.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: payload.failureReason ?? 'Deposit failed',
      updated_at: new Date().toISOString(),
    }).eq('id', momoReq.id);
  }

  return NextResponse.json({ received: true });
}
