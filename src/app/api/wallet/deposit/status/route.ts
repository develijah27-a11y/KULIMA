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
    .select('id, user_id, amount, status, type, provider_ref, provider, phone, failure_reason, created_at')
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
      message: momoReq.type === 'withdrawal' ? 'Withdrawal completed.' : 'Deposit confirmed and credited.',
    });
  }

  if (momoReq.status === 'failed') {
    return NextResponse.json({
      status: 'failed',
      amount: momoReq.amount,
      provider: momoReq.provider,
      reference: momoReq.provider_ref,
      message: momoReq.failure_reason || (momoReq.type === 'withdrawal' ? 'Withdrawal was declined or cancelled.' : 'Payment prompt was cancelled or declined.'),
    });
  }

  // If still processing or pending, inquire with PrimePay payment gateway
  const statusLookupId = momoReq.provider_ref || reference;
  const inquiry = await primepay.checkPaymentStatus(statusLookupId);

  if (inquiry.status === 'completed') {
    if (momoReq.type === 'deposit') {
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
    } else if (momoReq.type === 'withdrawal') {
      await Promise.all([
        (admin.from as any)('mobile_money_requests').update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        }).eq('id', momoReq.id),
        (admin.from as any)('wallet_transactions').update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        }).or(`reference.eq.${reference},reference.eq.${momoReq.provider_ref}`),
      ]);
    }

    return NextResponse.json({
      status: 'completed',
      amount: momoReq.amount,
      provider: momoReq.provider,
      reference: momoReq.provider_ref,
      message: momoReq.type === 'withdrawal'
        ? `Withdrawal of UGX ${Number(momoReq.amount).toLocaleString()} confirmed & delivered.`
        : `Deposit of UGX ${Number(momoReq.amount).toLocaleString()} confirmed and credited.`,
    });
  }

  if (inquiry.status === 'failed') {
    if (momoReq.type === 'withdrawal') {
      const { data: wallet } = await (admin.from as any)('wallets').select('id').eq('user_id', user.id).single();
      if (wallet) {
        await (admin as any).rpc('credit_wallet', { p_wallet_id: wallet.id, p_amount: momoReq.amount });
      }
      await Promise.all([
        (admin.from as any)('mobile_money_requests').update({
          status: 'failed',
          failure_reason: inquiry.message || 'Withdrawal payout failed on mobile network',
          updated_at: new Date().toISOString(),
        }).eq('id', momoReq.id),
        (admin.from as any)('wallet_transactions').update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        }).or(`reference.eq.${reference},reference.eq.${momoReq.provider_ref}`),
      ]);
    } else {
      await (admin.from as any)('mobile_money_requests').update({
        status: 'failed',
        failure_reason: inquiry.message || 'Payment prompt was declined or cancelled.',
        updated_at: new Date().toISOString(),
      }).eq('id', momoReq.id);
    }

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
    .select('id, user_id, amount, status, type, provider_ref, provider, phone, failure_reason')
    .eq('user_id', user.id)
    .or(`provider_ref.eq.${reference},id.eq.${reference}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!momoReq) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (momoReq.status === 'completed') {
    return NextResponse.json({ status: 'completed', message: 'Already completed' });
  }

  const statusLookupId = momoReq.provider_ref || reference;
  const inquiry = await primepay.checkPaymentStatus(statusLookupId);

  if (inquiry.status === 'completed') {
    if (momoReq.type === 'deposit') {
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
          }
        }
      }
    } else if (momoReq.type === 'withdrawal') {
      await Promise.all([
        (admin.from as any)('mobile_money_requests').update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        }).eq('id', momoReq.id),
        (admin.from as any)('wallet_transactions').update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        }).or(`reference.eq.${reference},reference.eq.${momoReq.provider_ref}`),
      ]);
    }

    return NextResponse.json({ status: 'completed', message: 'Transaction verified and updated.' });
  }

  return NextResponse.json({ status: momoReq.status });
}
