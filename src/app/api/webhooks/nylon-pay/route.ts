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

  const payload = body.payload || body.data || body;
  const transactionId = body.transaction_id || body.transactionId || payload.transaction_id || payload.transactionId;
  const reference = payload.reference || body.reference || transactionId;

  if (!reference && !transactionId) return NextResponse.json({ received: true });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: momoReq } = await (admin.from as any)('mobile_money_requests')
    .select('id, user_id, amount, status, type')
    .or(`provider_ref.eq.${transactionId || reference},provider_ref.eq.${reference},id.eq.${reference}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!momoReq || momoReq.status === 'completed') return NextResponse.json({ received: true });

  const statusStr = (body.status || payload.status || event || '').toLowerCase();
  const isSuccess =
    statusStr === 'success' ||
    statusStr === 'successful' ||
    statusStr === 'completed' ||
    statusStr === 'transaction.successful' ||
    statusStr === 'charge.success';

  if (isSuccess && momoReq.type === 'deposit') {
    const amount = Number(payload.amount ?? momoReq.amount);

    let claimed = false;
    try {
      const { data: rpcClaimed, error: claimErr } = await (admin as any).rpc('claim_deposit', {
        p_request_id: momoReq.id,
        p_wallet_user_id: momoReq.user_id,
        p_amount: amount,
        p_reference: reference,
        p_description: `Mobile money deposit via ${payload.provider || payload.method || 'mobile money'}`,
        p_metadata: { provider_transaction_id: payload.transactionId || payload.id, operator_tid: payload.operatorTid },
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
            metadata: { provider_transaction_id: payload.transactionId || payload.id, operator_tid: payload.operatorTid },
          });
        }
      }
    }
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
