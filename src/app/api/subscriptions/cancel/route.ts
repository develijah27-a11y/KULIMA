import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

// Entitlement stays live until current_period_end (standard SaaS behavior —
// no refund for the unused remainder, matches a prepaid period the user
// already paid for). getEffectiveTier checks expiry on every read, so no
// cron is needed to actually revoke access once the period ends.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subscriptionId } = await req.json();
  if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: subscription } = await (admin.from as any)('subscriptions')
    .select('id, user_id, role, plan, status').eq('id', subscriptionId).single();

  if (!subscription || subscription.user_id !== user.id) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }
  if (subscription.status !== 'active') {
    return NextResponse.json({ error: 'This subscription is not active' }, { status: 400 });
  }

  await (admin.from as any)('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', subscriptionId);

  await notifyUser(admin, {
    userId: user.id, type: 'system',
    title: 'Subscription cancelled',
    body: `Your ${subscription.plan} plan will remain active until the end of your current billing period, then won't renew.`,
    data: { subscription_id: subscriptionId },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
