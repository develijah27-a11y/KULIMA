import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('ref') || searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'Reference required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceRoleClient();

  const { data: momoReq } = await (admin.from as any)('mobile_money_requests')
    .select('id, amount, status, provider_ref, provider, phone, created_at')
    .eq('user_id', user.id)
    .eq('provider_ref', reference)
    .maybeSingle();

  if (!momoReq) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: momoReq.status,
    amount: momoReq.amount,
    provider: momoReq.provider,
    reference: momoReq.provider_ref,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reference } = await req.json();
  if (!reference) return NextResponse.json({ error: 'Reference required' }, { status: 400 });

  const admin = createServiceRoleClient();

  const { data: momoReq } = await (admin.from as any)('mobile_money_requests')
    .select('id, amount, status, provider_ref, provider, user_id')
    .eq('user_id', user.id)
    .eq('provider_ref', reference)
    .maybeSingle();

  if (!momoReq) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (momoReq.status === 'completed') {
    return NextResponse.json({ success: true, status: 'completed', message: 'Deposit already confirmed' });
  }

  // Claim deposit atomically and credit wallet
  const { data: claimed } = await (admin as any).rpc('claim_deposit', {
    p_request_id: momoReq.id,
    p_wallet_user_id: user.id,
    p_amount: Number(momoReq.amount),
    p_reference: reference,
    p_description: `Mobile money deposit via ${momoReq.provider ? momoReq.provider.toUpperCase() : 'Mobile Money'}`,
    p_metadata: { verified_via: 'instant_user_confirmation' },
  });

  if (claimed) {
    return NextResponse.json({
      success: true,
      status: 'completed',
      message: `Deposit of UGX ${Number(momoReq.amount).toLocaleString()} confirmed successfully.`,
    });
  }

  return NextResponse.json({ success: true, status: momoReq.status });
}
