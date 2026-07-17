import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logSystemEvent } from '@/lib/system-log';

export async function POST(req: Request) {
  const signature = req.headers.get('verif-hash') ?? '';
  const secret    = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret || signature !== secret) {
    logSystemEvent({
      category: 'auth_failure',
      level: 'error',
      route: '/api/webhooks/flutterwave',
      method: 'POST',
      message: secret ? 'Flutterwave webhook signature mismatch' : 'FLUTTERWAVE_WEBHOOK_SECRET not configured',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body  = await req.json();
  const event = body.event;
  const data  = body.data;

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (event === 'charge.completed' && data?.status === 'successful') {
    const txRef = data.tx_ref as string;
    if (!txRef?.startsWith('kulima-dep-')) return NextResponse.json({ received: true });

    // Find the mobile_money_request by flutterwave_ref
    const { data: momoReq } = await (admin.from as any)('mobile_money_requests')
      .select('id, user_id, amount, status')
      .or(`flutterwave_ref.eq.${txRef},flutterwave_ref.eq.${data.id}`)
      .eq('type', 'deposit')
      .maybeSingle();

    if (!momoReq || momoReq.status === 'completed') return NextResponse.json({ received: true });

    // Credit the amount Flutterwave actually reports as charged, not the
    // amount the client originally requested — the request row is user-
    // writable in principle, so trusting it would let a small real payment
    // be inflated into a large wallet credit.
    const amount = Number(data.amount ?? momoReq.amount);

    // Atomic claim: UPDATE ... WHERE status <> 'completed' takes a row lock,
    // so a retried/duplicated webhook delivery for the same request loses
    // the race and credits nothing the second time.
    const { data: claimed } = await (admin as any).rpc('claim_deposit', {
      p_request_id: momoReq.id,
      p_wallet_user_id: momoReq.user_id,
      p_amount: amount,
      p_reference: txRef,
      p_description: `Mobile money deposit via ${data.payment_type ?? 'MoMo'}`,
      p_metadata: { flw_tx_id: data.id, flw_ref: data.flw_ref },
    });
    if (!claimed) return NextResponse.json({ received: true });
  }

  if (event === 'transfer.completed') {
    const txRef = data?.reference as string;
    if (!txRef?.startsWith('kulima-wdl-')) return NextResponse.json({ received: true });

    const status = data?.status === 'SUCCESSFUL' ? 'completed' : 'failed';

    await (admin.from as any)('mobile_money_requests').update({
      status,
      updated_at: new Date().toISOString(),
    }).eq('flutterwave_ref', txRef);

    if (status === 'failed') {
      logSystemEvent({
        category: 'failed_payment',
        level: 'error',
        route: '/api/webhooks/flutterwave',
        method: 'POST',
        message: `Withdrawal transfer reported failed by Flutterwave: ${data?.complete_message ?? data?.status}`,
        metadata: { txRef },
      });
    }
  }

  return NextResponse.json({ received: true });
}
