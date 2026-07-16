import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUsers } from '@/lib/push';

// Vercel cron — reminds buyers/requesters who placed an order or delivery
// request but never funded escrow, so the seller/driver isn't left waiting
// indefinitely and the buyer knows the clock is running before it gets
// cancelled for non-payment.
const REMINDER_AFTER_MS = 2 * 60 * 60 * 1000; // 2 hours after creation
const REMIND_EVERY_MS   = 12 * 60 * 60 * 1000; // don't re-nag more than every 12h

export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const cutoff = new Date(Date.now() - REMINDER_AFTER_MS).toISOString();
  const quietSince = new Date(Date.now() - REMIND_EVERY_MS).toISOString();

  let ordersReminded = 0;
  let deliveriesReminded = 0;

  // ── Marketplace orders placed but never funded (orders.escrow_id stays
  // null until the buyer pays — see /api/orders POST) ──
  const { data: unpaidOrders } = await (supabase.from as any)('orders')
    .select('id, buyer_id, crop_type, quantity_kg, total_amount, created_at')
    .eq('status', 'pending')
    .is('escrow_id', null)
    .lte('created_at', cutoff);

  for (const order of (unpaidOrders ?? []) as any[]) {
    const title = 'Payment still pending';
    const { data: already } = await (supabase.from as any)('notifications')
      .select('id').eq('user_id', order.buyer_id).eq('title', title)
      .contains('data', { order_id: order.id })
      .gte('created_at', quietSince).maybeSingle();
    if (already) continue;

    const body = `Your order for ${order.quantity_kg}kg of ${order.crop_type} (UGX ${Math.round(order.total_amount).toLocaleString()}) is still awaiting your escrow payment. Unpaid orders can be cancelled — pay now to keep it active.`;
    await (supabase.from as any)('notifications').insert({
      user_id: order.buyer_id, role: 'buyer', type: 'payment', title, body, read: false,
      data: { order_id: order.id },
    });
    await sendPushToUsers([order.buyer_id], { title, body, url: `/buyer/orders/${order.id}` });
    ordersReminded++;
  }

  // ── Delivery requests placed but never paid into escrow
  // (delivery_requests.payment_status stays 'pending' until funded) ──
  const { data: unpaidDeliveries } = await (supabase.from as any)('delivery_requests')
    .select('id, requester_id, requester_role, cargo_type, cargo_kg, estimated_fare, created_at')
    .eq('payment_status', 'pending')
    .in('status', ['open', 'assigned'])
    .lte('created_at', cutoff);

  for (const d of (unpaidDeliveries ?? []) as any[]) {
    const title = 'Delivery payment still pending';
    const { data: already } = await (supabase.from as any)('notifications')
      .select('id').eq('user_id', d.requester_id).eq('title', title)
      .contains('data', { delivery_id: d.id })
      .gte('created_at', quietSince).maybeSingle();
    if (already) continue;

    const body = `Your delivery request for ${d.cargo_kg}kg of ${d.cargo_type} (UGX ${Math.round(d.estimated_fare ?? 0).toLocaleString()}) is still awaiting payment. Unpaid delivery requests can be cancelled — pay now so a driver can be assigned.`;
    await (supabase.from as any)('notifications').insert({
      user_id: d.requester_id, role: d.requester_role ?? null, type: 'payment', title, body, read: false,
      data: { delivery_id: d.id },
    });
    await sendPushToUsers([d.requester_id], { title, body, url: '/farmer/deliveries' });
    deliveriesReminded++;
  }

  return NextResponse.json({ success: true, ordersReminded, deliveriesReminded });
}
