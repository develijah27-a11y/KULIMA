import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const signature = req.headers.get('verif-hash') ?? '';
  const secret    = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret || signature !== secret) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

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

    const { data: wallet } = await (admin.from as any)('wallets')
      .select('id, balance')
      .eq('user_id', momoReq.user_id)
      .single();

    if (!wallet) return NextResponse.json({ received: true });

    const amount = Number(momoReq.amount);

    await Promise.all([
      // Credit wallet
      (admin.from as any)('wallets').update({
        balance: Number(wallet.balance) + amount,
        updated_at: new Date().toISOString(),
      }).eq('id', wallet.id),
      // Log transaction
      (admin.from as any)('wallet_transactions').insert({
        wallet_id: wallet.id,
        user_id: momoReq.user_id,
        type: 'deposit',
        amount,
        status: 'completed',
        reference: txRef,
        description: `Mobile money deposit via ${data.payment_type ?? 'MoMo'}`,
        metadata: { flw_tx_id: data.id, flw_ref: data.flw_ref },
      }),
      // Mark momo request complete
      (admin.from as any)('mobile_money_requests').update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', momoReq.id),
    ]);
  }

  if (event === 'transfer.completed') {
    const txRef = data?.reference as string;
    if (!txRef?.startsWith('kulima-wdl-')) return NextResponse.json({ received: true });

    const status = data?.status === 'SUCCESSFUL' ? 'completed' : 'failed';

    await (admin.from as any)('mobile_money_requests').update({
      status,
      updated_at: new Date().toISOString(),
    }).eq('flutterwave_ref', txRef);
  }

  return NextResponse.json({ received: true });
}
