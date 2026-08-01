import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';
import { getPlan, priceFor } from '@/lib/subscriptions/plans';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS (users_own_subscriptions) already scopes this to the caller's own rows.
  const { data, error } = await (supabase.from as any)('subscriptions')
    .select('id, role, plan, billing_cycle, status, amount_ugx, started_at, current_period_end, cancelled_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ subscriptions: [] });
  return NextResponse.json({ subscriptions: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId, billingCycle } = await req.json();
  if (!planId || !['monthly', 'yearly'].includes(billingCycle)) {
    return NextResponse.json({ error: 'planId and a valid billingCycle are required' }, { status: 400 });
  }

  const plan = getPlan(planId);
  if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  if (!plan.selfServe) {
    return NextResponse.json({ error: `${plan.label} is a custom plan — contact sales to set it up.` }, { status: 400 });
  }

  const amount = priceFor(plan, billingCycle);
  const admin = createServiceRoleClient();
  const now = new Date();
  const periodDays = billingCycle === 'yearly' ? 365 : 30;
  const currentPeriodEnd = new Date(now.getTime() + periodDays * 86400000).toISOString();

  let groupId: string | null = null;

  if (plan.billedBy === 'group') {
    // Group Pro is purchased by the group's leader on behalf of the whole
    // group, from the group's own pooled wallet — not the caller's personal
    // wallet. Only the leader may do this.
    const { data: profile } = await (supabase.from as any)('profiles').select('id').eq('user_id', user.id).single();
    const { data: group } = profile
      ? await (supabase.from as any)('farmer_groups').select('id').eq('leader_id', profile.id).maybeSingle()
      : { data: null };
    if (!group) return NextResponse.json({ error: 'Only the group leader can purchase Group Pro' }, { status: 403 });
    groupId = group.id;

    const { data: debited } = await (admin as any).rpc('claim_group_wallet_debit', { p_group_id: groupId, p_amount: amount });
    if (!debited) {
      return NextResponse.json({ error: `Insufficient group wallet balance. Need UGX ${amount.toLocaleString()}.` }, { status: 400 });
    }
    await (admin.from as any)('group_wallet_transactions').insert({
      group_admin_id: user.id, type: 'subscription', amount,
      description: `${plan.label} subscription (${billingCycle})`,
    });
  } else {
    const { data: wallet } = await (admin.from as any)('wallets').select('id').eq('user_id', user.id).single();
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

    const { data: debited } = await (admin as any).rpc('claim_wallet_debit', { p_wallet_id: wallet.id, p_amount: amount });
    if (!debited) {
      return NextResponse.json({ error: `Insufficient wallet balance. Need UGX ${amount.toLocaleString()}. Please top up your wallet.` }, { status: 400 });
    }
    await (admin.from as any)('wallet_transactions').insert({
      wallet_id: wallet.id, user_id: user.id, type: 'subscription', amount, status: 'completed',
      description: `${plan.label} subscription (${billingCycle})`,
    });
  }

  const { data: subscription, error: subErr } = await (admin.from as any)('subscriptions').insert({
    user_id: user.id,
    role: plan.role,
    plan: plan.id,
    billing_cycle: billingCycle,
    status: 'active',
    amount_ugx: amount,
    current_period_end: currentPeriodEnd,
    billed_by: plan.billedBy,
    billed_by_group_id: groupId,
  }).select().single();

  if (subErr) {
    console.error('[/api/subscriptions POST]', subErr);
    return NextResponse.json({ error: 'Payment succeeded but activating the plan failed — contact support with this order reference.' }, { status: 500 });
  }

  // Additive merge — approving/renewing one role's tier must never clobber
  // a different role's independently-held tier (same reasoning as
  // role_verification_levels in /api/admin/verify-kyc).
  const { data: profile } = await (admin.from as any)('profiles').select('role_subscription_tiers').eq('user_id', user.id).single();
  const roleTiers = { ...(profile?.role_subscription_tiers ?? {}), [plan.role]: { plan: plan.id, expiresAt: currentPeriodEnd } };
  await (admin.from as any)('profiles').update({ role_subscription_tiers: roleTiers }).eq('user_id', user.id);

  await notifyUser(admin, {
    userId: user.id, type: 'system',
    title: `${plan.label} activated`,
    body: `Your ${plan.label} subscription is active until ${new Date(currentPeriodEnd).toLocaleDateString()}.`,
    data: { subscription_id: subscription.id },
  }).catch(() => {});

  return NextResponse.json({ success: true, subscription });
}
