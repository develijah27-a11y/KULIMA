/**
 * PATCH /api/orders/[id]/status
 *
 * Handles all order status transitions with proper auth checks:
 *  Farmer:  confirmed → dispatched → delivered
 *  Buyer:   delivered → completed  (triggers escrow release)
 *           delivered → disputed   (raises dispute)
 *           pending   → cancelled
 *  Admin:   any → cancelled
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const ALLOWED_TRANSITIONS: Record<string, Record<string, string[]>> = {
  farmer: {
    pending:    ['confirmed'],
    confirmed:  ['dispatched'],
    paid:       ['in_transit'],
    in_transit: ['delivered'],
  },
  buyer: {
    delivered:  ['completed', 'disputed'],
    pending:    ['cancelled'],
    dispatched: ['cancelled'],
  },
  admin: {
    pending:          ['confirmed', 'cancelled'],
    confirmed:        ['dispatched', 'cancelled'],
    dispatched:       ['in_transit', 'cancelled'],
    awaiting_payment: ['in_transit', 'cancelled'],
    paid:             ['in_transit', 'cancelled'],
    in_transit:       ['delivered', 'cancelled'],
    delivered:        ['completed', 'disputed'],
    disputed:         ['completed', 'cancelled'],
  },
};

const STATUS_TIMESTAMPS: Record<string, string> = {
  confirmed:        'confirmed_at',
  dispatched:       'dispatched_at',
  awaiting_payment: 'awaiting_payment_at',
  paid:             'paid_at',
  in_transit:       'in_transit_at',
  delivered:        'delivered_at',
  completed:        'completed_at',
  cancelled:        'cancelled_at',
  disputed:         'disputed_at',
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { newStatus: string; note?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { newStatus, note } = body;
  if (!newStatus) return NextResponse.json({ error: 'newStatus required' }, { status: 400 });

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Load order + profile
  const [orderRes, profileRes] = await Promise.all([
    (db.from as any)('orders').select('*').eq('id', orderId).single(),
    (db.from as any)('profiles').select('id, role, user_id').eq('user_id', user.id).single(),
  ]);

  if (!orderRes.data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const order = orderRes.data;
  const profile = profileRes.data;
  const primaryRole = profile?.role ?? 'buyer';

  // Determine caller's relationship to the order
  const isBuyer   = order.buyer_id === user.id;
  const isFarmer  = order.farmer_profile_id === profile?.id;
  const isAdmin   = primaryRole === 'admin';

  if (!isBuyer && !isFarmer && !isAdmin) {
    return NextResponse.json({ error: 'Not authorized for this order' }, { status: 403 });
  }

  // Which transition map applies
  const allowedMap = isAdmin
    ? ALLOWED_TRANSITIONS.admin
    : isFarmer
    ? ALLOWED_TRANSITIONS.farmer
    : ALLOWED_TRANSITIONS.buyer;

  const allowed = allowedMap[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json({
      error: `Cannot move from '${order.status}' to '${newStatus}' as ${isAdmin ? 'admin' : isFarmer ? 'farmer' : 'buyer'}`,
    }, { status: 422 });
  }

  const now = new Date().toISOString();
  const tsField = STATUS_TIMESTAMPS[newStatus];

  const updatePayload: Record<string, unknown> = {
    status:     newStatus,
    updated_at: now,
    ...(tsField ? { [tsField]: now } : {}),
    ...(note && isFarmer  ? { farmer_note: note } : {}),
    ...(note && isBuyer   ? { buyer_note: note }  : {}),
  };

  const { data: updated, error: updateErr } = await (db.from as any)('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // ── Side-effects by new status ─────────────────────────────────────────────

  const notifBase = {
    data: { order_id: orderId },
    type: 'order',
  };

  if (newStatus === 'dispatched') {
    // Farmer shipped → notify buyer to pay
    await (db.from as any)('notifications').insert({
      ...notifBase,
      user_id: order.buyer_id,
      title:   `Your ${order.crop_type} order has been shipped`,
      body:    `Please make payment of UGX ${Number(order.total_amount).toLocaleString()} in the app to proceed. Funds will be held securely until delivery.`,
    });
    // Update order status to awaiting_payment to signal buyer action required
    await (db.from as any)('orders').update({
      status:               'awaiting_payment',
      awaiting_payment_at:  now,
      updated_at:           now,
    }).eq('id', orderId);
  }

  if (newStatus === 'completed') {
    // Buyer confirmed delivery — release escrow
    if (order.escrow_id) {
      const { data: escrow } = await (db.from as any)('escrow_accounts')
        .select('*').eq('id', order.escrow_id).eq('status', 'funded').single();
      if (escrow) {
        const { data: commission } = await (db.from as any)('platform_commission')
          .select('rate_percent, min_fee_ugx, platform_wallet_user_id')
          .eq('active', true).single();
        const rate   = commission?.rate_percent ?? 2.5;
        const minFee = commission?.min_fee_ugx ?? 500;
        const gross  = Number(escrow.amount);
        let fee = Math.round(gross * rate / 100);
        if (fee < minFee) fee = minFee;
        const net = gross - fee;

        // ── Group listing: split payout across contributing members ──
        if (order.group_listing_id) {
          const { data: groupListing } = await (db.from as any)('group_listings')
            .select('admin_id, total_quantity_kg').eq('id', order.group_listing_id).single();

          if (groupListing) {
            const adminId = groupListing.admin_id;
            const { data: contributions } = await (db.from as any)('group_listing_contributions')
              .select('farmer_id, quantity_kg').eq('group_listing_id', order.group_listing_id);

            if (contributions && contributions.length > 0) {
              // Proportional split: each member gets net * (their kg / total kg).
              // Credit each member's own wallet directly — no manual admin transfers.
              const totalKg = contributions.reduce((s: number, c: any) => s + Number(c.quantity_kg), 0);
              await (db.from as any)('escrow_accounts').update({ status: 'released', released_at: now }).eq('id', escrow.id);

              for (const c of contributions) {
                const share = Math.round(net * (Number(c.quantity_kg) / totalKg));
                if (share <= 0) continue;

                const { data: memberProfile } = await (db.from as any)('profiles')
                  .select('user_id').eq('id', c.farmer_id).single();
                if (!memberProfile) continue;

                const { data: memberWallet } = await (db.from as any)('wallets')
                  .select('id, balance').eq('user_id', memberProfile.user_id).single();
                if (!memberWallet) continue;

                await Promise.all([
                  (db.from as any)('wallets').update({
                    balance: Number(memberWallet.balance) + share, updated_at: now,
                  }).eq('id', memberWallet.id),
                  (db.from as any)('wallet_transactions').insert({
                    wallet_id: memberWallet.id, user_id: memberProfile.user_id,
                    type: 'payout', amount: share, status: 'completed', order_id: orderId,
                    description: `Group sale payout — ${c.quantity_kg}kg contributed (${rate}% fee deducted)`,
                  }),
                  (db.from as any)('notifications').insert({
                    ...notifBase,
                    user_id: memberProfile.user_id,
                    type:    'payment',
                    title:   'Group sale payout received',
                    body:    `UGX ${share.toLocaleString()} added to your wallet for your ${c.quantity_kg}kg contribution.`,
                  }),
                ]);
              }

              await (db.from as any)('group_wallet_transactions').insert({
                group_admin_id: adminId,
                order_id:       orderId,
                type:           'sale_payout',
                amount:         net,
                description:    `Group sale — split across ${contributions.length} contributing member(s) (${rate}% fee deducted)`,
              });

              return NextResponse.json({ success: true, data: updated });
            }

            // Fallback: no per-member contributions recorded for this listing —
            // credit the pooled group wallet as before (admin distributes manually).
            const { data: leaderProfile } = await (db.from as any)('profiles')
              .select('id').eq('user_id', adminId).single();
            if (leaderProfile) {
              const { data: farmGroup } = await (db.from as any)('farmer_groups')
                .select('id, wallet_balance').eq('leader_id', leaderProfile.id).single();
              if (farmGroup) {
                await Promise.all([
                  (db.from as any)('escrow_accounts').update({ status: 'released', released_at: now }).eq('id', escrow.id),
                  (db.from as any)('farmer_groups').update({
                    wallet_balance:    Number(farmGroup.wallet_balance) + net,
                    wallet_updated_at: now,
                  }).eq('id', farmGroup.id),
                  (db.from as any)('group_wallet_transactions').insert({
                    group_admin_id: adminId,
                    order_id:       orderId,
                    type:           'sale_payout',
                    amount:         net,
                    description:    `Group sale payout (${rate}% fee deducted)`,
                  }),
                  (db.from as any)('notifications').insert({
                    ...notifBase,
                    user_id: adminId,
                    type:    'payment',
                    title:   'Group sale proceeds received',
                    body:    `UGX ${net.toLocaleString()} added to your group wallet (after ${rate}% platform fee).`,
                  }),
                ]);
                return NextResponse.json({ success: true, data: updated });
              }
            }
          }
        }

        // ── Individual seller: credit personal wallet ──
        const { data: sellerWallet } = await (db.from as any)('wallets')
          .select('id, balance').eq('user_id', escrow.seller_user_id).single();

        if (sellerWallet) {
          await Promise.all([
            (db.from as any)('escrow_accounts').update({ status: 'released', released_at: now }).eq('id', escrow.id),
            (db.from as any)('wallets').update({ balance: Number(sellerWallet.balance) + net, updated_at: now }).eq('id', sellerWallet.id),
            (db.from as any)('wallet_transactions').insert([
              { wallet_id: sellerWallet.id, user_id: escrow.seller_user_id, type: 'payout', amount: net, status: 'completed', order_id: orderId, description: `Payout for order (${rate}% fee deducted)` },
              { wallet_id: sellerWallet.id, user_id: escrow.seller_user_id, type: 'fee',    amount: fee, status: 'completed', order_id: orderId, description: `Platform fee (${rate}%)` },
            ]),
            (db.from as any)('notifications').insert({
              ...notifBase,
              farmer_id: order.farmer_profile_id,
              user_id:   escrow.seller_user_id,
              type:      'payment',
              title:     'Payment released to your wallet',
              body:      `UGX ${net.toLocaleString()} has been added to your wallet (after ${rate}% platform fee).`,
            }),
          ]);
        }
      }
    }
  }

  if (newStatus === 'disputed') {
    // Mark escrow as disputed so admin sees it
    if (order.escrow_id) {
      await (db.from as any)('escrow_accounts').update({ status: 'disputed' }).eq('id', order.escrow_id);
    }
    // Notify admin (uses a system notification — admin sees all)
    await (db.from as any)('notifications').insert({
      ...notifBase,
      type:  'alert',
      title: `Dispute raised on order #${orderId.slice(0, 8)}`,
      body:  `Buyer raised a dispute. Admin intervention required.`,
    });
  }

  if (newStatus === 'confirmed') {
    // Notify buyer that farmer confirmed
    await (db.from as any)('notifications').insert({
      ...notifBase,
      user_id: order.buyer_id,
      title:   `Order confirmed — ${order.crop_type}`,
      body:    `The farmer has confirmed your order. They will notify you when the goods are shipped.`,
    });
  }

  if (newStatus === 'delivered') {
    // Notify buyer to confirm delivery and release payment
    await (db.from as any)('notifications').insert({
      ...notifBase,
      user_id: order.buyer_id,
      title:   `${order.crop_type} delivered — please confirm receipt`,
      body:    `Mark the order as complete to release payment to the farmer. If there's an issue, you can raise a dispute.`,
    });
  }

  if (newStatus === 'cancelled') {
    // Refund escrow if it was funded
    if (order.escrow_id) {
      const { data: escrow } = await (db.from as any)('escrow_accounts')
        .select('*').eq('id', order.escrow_id).in('status', ['funded', 'disputed']).single();
      if (escrow) {
        const { data: buyerWallet } = await (db.from as any)('wallets')
          .select('id, balance').eq('user_id', escrow.buyer_user_id).single();
        if (buyerWallet) {
          await Promise.all([
            (db.from as any)('escrow_accounts').update({ status: 'refunded' }).eq('id', escrow.id),
            (db.from as any)('wallets').update({ balance: Number(buyerWallet.balance) + Number(escrow.amount), updated_at: now }).eq('id', buyerWallet.id),
            (db.from as any)('wallet_transactions').insert({
              wallet_id: buyerWallet.id, user_id: escrow.buyer_user_id,
              type: 'escrow_refund', amount: Number(escrow.amount),
              status: 'completed', order_id: orderId,
              description: 'Refund: order cancelled',
            }),
            (db.from as any)('notifications').insert({
              ...notifBase,
              user_id: order.buyer_id,
              type:    'payment',
              title:   'Order cancelled — refund issued',
              body:    `UGX ${Number(escrow.amount).toLocaleString()} has been refunded to your wallet.`,
            }),
          ]);
        }
      }
    }
  }

  return NextResponse.json({ success: true, data: updated });
}
