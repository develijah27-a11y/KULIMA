import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { primepay } from '@/lib/prime-pay';

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
    .select('id, amount, status, provider_ref, provider, phone, failure_reason, created_at')
    .eq('user_id', user.id)
    .or(`provider_ref.eq.${reference},id.eq.${reference}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!momoReq) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (momoReq.status === 'completed') {
    return NextResponse.json({
      status: 'completed',
      amount: momoReq.amount,
      provider: momoReq.provider,
      reference: momoReq.provider_ref,
      message: 'Deposit confirmed and credited.',
    });
  }

  if (momoReq.status === 'failed') {
    return NextResponse.json({
      status: 'failed',
      amount: momoReq.amount,
      provider: momoReq.provider,
      reference: momoReq.provider_ref,
      message: momoReq.failure_reason || 'Payment prompt was cancelled or declined.',
    });
  }

  // If still processing or pending, inquire with payment gateway
  const inquiry = await primepay.checkPaymentStatus(reference);
  if (inquiry.status === 'completed') {
    let credited = false;
    try {
      const { data: claimed, error: claimErr } = await (admin as any).rpc('claim_deposit', {
        p_request_id: momoReq.id,
        p_wallet_user_id: user.id,
        p_amount: Number(momoReq.amount),
        p_reference: reference,
        p_description: `Mobile money deposit via ${momoReq.provider ? momoReq.provider.toUpperCase() : 'Mobile Money'}`,
        p_metadata: { verified_via: 'live_gateway_inquiry' },
      });
      if (!claimErr && claimed) credited = true;
    } catch {}

    // Fallback: direct atomic update if RPC is unavailable in live database
    if (!credited) {
      const { data: updatedReq } = await (admin.from as any)('mobile_money_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', momoReq.id)
        .neq('status', 'completed')
        .select('id')
        .maybeSingle();

      if (updatedReq) {
        const { data: userWallet } = await (admin.from as any)('wallets').select('id, balance').eq('user_id', user.id).single();
        if (userWallet) {
          await (admin.from as any)('wallets').update({
            balance: Number(userWallet.balance || 0) + Number(momoReq.amount),
            updated_at: new Date().toISOString(),
          }).eq('id', userWallet.id);

          await (admin.from as any)('wallet_transactions').insert({
            wallet_id: userWallet.id,
            user_id: user.id,
            type: 'deposit',
            amount: Number(momoReq.amount),
            status: 'completed',
            reference: reference,
            description: `Mobile money deposit via ${momoReq.provider ? momoReq.provider.toUpperCase() : 'Mobile Money'}`,
          });
          credited = true;
        }
      }
    }

    if (credited) {
      return NextResponse.json({
        status: 'completed',
        amount: momoReq.amount,
        provider: momoReq.provider,
        reference: momoReq.provider_ref,
        message: `Deposit of UGX ${Number(momoReq.amount).toLocaleString()} confirmed and credited.`,
      });
    }
  } else if (inquiry.status === 'failed') {
    await (admin.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: inquiry.message || 'Payment prompt was declined or cancelled.',
      updated_at: new Date().toISOString(),
    }).eq('id', momoReq.id);

    return NextResponse.json({
      status: 'failed',
      amount: momoReq.amount,
      provider: momoReq.provider,
      reference: momoReq.provider_ref,
      message: inquiry.message || 'Payment prompt was declined or cancelled.',
    });
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
    .select('id, amount, status, provider_ref, provider, user_id, failure_reason')
    .eq('user_id', user.id)
    .eq('provider_ref', reference)
    .maybeSingle();

  if (!momoReq) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (momoReq.status === 'completed') {
    return NextResponse.json({ success: true, status: 'completed', message: 'Deposit already confirmed and credited to your wallet.' });
  }

  if (momoReq.status === 'failed') {
    return NextResponse.json({
      success: false,
      status: 'failed',
      error: momoReq.failure_reason || 'Payment prompt was cancelled or declined on your handset.',
    }, { status: 400 });
  }

  // Inquire status with payment provider — never credit blindly without payment verification
  const check = await primepay.checkPaymentStatus(reference);

  if (check.status === 'completed') {
    let credited = false;
    try {
      const { data: claimed, error: claimErr } = await (admin as any).rpc('claim_deposit', {
        p_request_id: momoReq.id,
        p_wallet_user_id: user.id,
        p_amount: Number(momoReq.amount),
        p_reference: reference,
        p_description: `Mobile money deposit via ${momoReq.provider ? momoReq.provider.toUpperCase() : 'Mobile Money'}`,
        p_metadata: { verified_via: 'verified_user_check' },
      });
      if (!claimErr && claimed) credited = true;
    } catch {}

    if (!credited) {
      const { data: updatedReq } = await (admin.from as any)('mobile_money_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', momoReq.id)
        .neq('status', 'completed')
        .select('id')
        .maybeSingle();

      if (updatedReq) {
        const { data: userWallet } = await (admin.from as any)('wallets').select('id, balance').eq('user_id', user.id).single();
        if (userWallet) {
          await (admin.from as any)('wallets').update({
            balance: Number(userWallet.balance || 0) + Number(momoReq.amount),
            updated_at: new Date().toISOString(),
          }).eq('id', userWallet.id);

          await (admin.from as any)('wallet_transactions').insert({
            wallet_id: userWallet.id,
            user_id: user.id,
            type: 'deposit',
            amount: Number(momoReq.amount),
            status: 'completed',
            reference: reference,
            description: `Mobile money deposit via ${momoReq.provider ? momoReq.provider.toUpperCase() : 'Mobile Money'}`,
          });
          credited = true;
        }
      }
    }

    if (credited) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: `Deposit of UGX ${Number(momoReq.amount).toLocaleString()} confirmed and credited to your wallet.`,
      });
    }
  }

  if (check.status === 'failed') {
    await (admin.from as any)('mobile_money_requests').update({
      status: 'failed',
      failure_reason: check.message || 'Payment prompt declined on phone.',
      updated_at: new Date().toISOString(),
    }).eq('id', momoReq.id);

    return NextResponse.json({
      success: false,
      status: 'failed',
      error: check.message || 'Payment was declined or timed out on your mobile money handset. Please try again.',
    }, { status: 400 });
  }

  // Still processing on the telecom network
  return NextResponse.json({
    success: false,
    status: 'processing',
    message: 'We have not yet received payment approval from your mobile network. Please enter your PIN on your phone (or check pending approvals on *165# for MTN / *185# for Airtel), then verify again.',
  });
}
