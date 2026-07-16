import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { calcFare } from '@/lib/delivery-pricing';
import { rateLimit } from '@/lib/rate-limit';
import { sendPushToUsers } from '@/lib/push';

const admin = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`escrow:${user.id}`, 10, 60))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  }

  const { action, offerId, orderId } = await req.json();
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const db = admin();

  // ──────────────────────────────────────────────────────────────────────────
  // FUND — buyer pays into escrow after seller marks order dispatched
  // Accepts either orderId (preferred) or offerId (legacy offer-based flow)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'fund') {
    if (!orderId && !offerId) {
      return NextResponse.json({ error: 'orderId or offerId required' }, { status: 400 });
    }

    let sellerUserId: string;
    let totalAmount: number;
    let escrowInsertData: Record<string, unknown>;

    if (orderId) {
      // Order-based escrow — buyer pays once the farmer has confirmed. Payment
      // is what confirms real delivery intent, so no delivery request exists
      // (and no transporter can be dispatched) until this succeeds below.
      const { data: order, error: orderErr } = await (db.from as any)('orders')
        .select('id, buyer_id, farmer_profile_id, total_amount, status, escrow_id, crop_type, quantity_kg, pickup_district, dropoff_district, group_listing_id, farmer:profiles!farmer_profile_id(user_id)')
        .eq('id', orderId)
        .single();

      if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 });
      if (order.status !== 'confirmed') {
        return NextResponse.json({ error: 'Escrow can only be funded after the farmer confirms the order' }, { status: 409 });
      }
      if (order.escrow_id) {
        return NextResponse.json({ error: 'Escrow already funded for this order' }, { status: 409 });
      }

      sellerUserId = order.farmer?.user_id;
      if (!sellerUserId) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

      totalAmount = Math.round(Number(order.total_amount));
      escrowInsertData = {
        order_id:       orderId,
        buyer_user_id:  user.id,
        seller_user_id: sellerUserId,
        amount:         totalAmount,
        status:         'funded',
      };
    } else {
      // Legacy offer-based escrow
      const { data: offer, error: offerErr } = await (db.from as any)('offers')
        .select('id, buyer_id, status, offered_price, counter_price, listing:listings(id, farmer_id, quantity_kg, farmer:profiles(user_id))')
        .eq('id', offerId)
        .eq('buyer_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (offerErr || !offer) return NextResponse.json({ error: 'Offer not found or not accepted' }, { status: 404 });

      const { data: existingEscrow } = await (db.from as any)('escrow_accounts')
        .select('id').eq('offer_id', offerId).maybeSingle();
      if (existingEscrow) return NextResponse.json({ error: 'Escrow already funded for this offer' }, { status: 409 });

      sellerUserId = offer.listing?.farmer?.user_id;
      if (!sellerUserId) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

      const finalPrice = offer.counter_price ?? offer.offered_price;
      totalAmount = Math.round(finalPrice * (offer.listing?.quantity_kg ?? 0));
      if (totalAmount <= 0) return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 });

      escrowInsertData = {
        offer_id:       offerId,
        buyer_user_id:  user.id,
        seller_user_id: sellerUserId,
        amount:         totalAmount,
        status:         'funded',
      };
    }

    // Check buyer balance (soft pre-check for a clean error message — the
    // real enforcement is the atomic RPC below)
    const { data: buyerWallet } = await (db.from as any)('wallets')
      .select('id, balance').eq('user_id', user.id).single();
    if (!buyerWallet || Number(buyerWallet.balance) < totalAmount) {
      return NextResponse.json({
        error: `Insufficient balance. Need UGX ${totalAmount.toLocaleString()}. Please top up your wallet.`,
      }, { status: 400 });
    }

    let escrowId: string;

    if (orderId) {
      // Atomic: locks the buyer's wallet row, inserts the escrow row (unique
      // on order_id), then debits — a concurrent duplicate "fund" call for
      // the same order fails on the unique insert before any money moves,
      // closing the double-charge race a plain read-then-write would have.
      const { data: claimedId, error: claimErr } = await (db as any).rpc('claim_escrow_fund', {
        p_order_id: orderId,
        p_buyer_user_id: user.id,
        p_seller_user_id: sellerUserId,
        p_amount: totalAmount,
      });
      if (claimErr || !claimedId) {
        const alreadyFunded = claimErr?.message?.includes('already funded');
        return NextResponse.json({
          error: alreadyFunded ? 'Escrow already funded for this order' : (claimErr?.message ?? 'Failed to create escrow'),
        }, { status: alreadyFunded ? 409 : 500 });
      }
      escrowId = claimedId;
    } else {
      // Legacy offer-based escrow — backstopped by a unique index on
      // escrow_accounts.offer_id, but not fully atomic like the order path.
      const [walletUpdate, escrowInsert, txnInsert] = await Promise.all([
        (db.from as any)('wallets').update({
          balance:    Number(buyerWallet.balance) - totalAmount,
          updated_at: new Date().toISOString(),
        }).eq('id', buyerWallet.id),
        (db.from as any)('escrow_accounts').insert(escrowInsertData).select('id').single(),
        (db.from as any)('wallet_transactions').insert({
          wallet_id:   buyerWallet.id,
          user_id:     user.id,
          type:        'escrow_lock',
          amount:      totalAmount,
          status:      'completed',
          description: `Escrow funded for offer`,
        }),
      ]);
      if (escrowInsert.error) return NextResponse.json({ error: 'Failed to create escrow' }, { status: 500 });
      escrowId = escrowInsert.data.id;
    }

    // Link escrow to order + update status to 'paid'
    if (orderId) {
      const now = new Date().toISOString();
      await (db.from as any)('orders').update({
        escrow_id:  escrowId,
        status:     'paid',
        paid_at:    now,
        updated_at: now,
      }).eq('id', orderId);

      const { data: order } = await (db.from as any)('orders')
        .select('farmer_profile_id, crop_type, quantity_kg, pickup_district, dropoff_district, delivery_request_id')
        .eq('id', orderId).single();

      if (order) {
        // Notify seller
        await (db.from as any)('notifications').insert({
          farmer_id: order.farmer_profile_id,
          user_id:   sellerUserId,
          role:      'farmer',
          type:      'payment',
          title:     'Payment received — proceed to ship',
          body:      `The buyer has paid UGX ${totalAmount.toLocaleString()} into escrow. A transporter will be matched shortly.`,
          data:      { order_id: orderId },
        });

        // Payment confirms the buyer genuinely wants this delivered — only
        // now does a delivery request exist for transporters to pick up.
        if (!order.delivery_request_id && order.pickup_district) {
          const dropoff = order.dropoff_district ?? 'Kampala';
          const fare = calcFare(order.pickup_district, dropoff, Number(order.quantity_kg), 'standard');

          const { data: dr } = await (db.from as any)('delivery_requests').insert({
            requester_id:      user.id,
            pickup_district:   order.pickup_district,
            dropoff_district:  dropoff,
            cargo_kg:          order.quantity_kg,
            cargo_type:        order.crop_type,
            pickup_date:       new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            status:            'open',
            delivery_type:     'standard',
            estimated_fare:    fare.totalFare,
            distance_km:       fare.distanceKm,
            commission_rate:   10,
            commission_amount: fare.commissionAmount,
            driver_earnings:   fare.driverEarnings,
            payment_status:    'pending',
            notes:             `Order #${orderId.slice(0, 8)} — ${order.crop_type}`,
          }).select('id').single();

          if (dr) {
            await (db.from as any)('orders').update({ delivery_request_id: dr.id }).eq('id', orderId);

            // Auto-match available, right-sized verified drivers covering the
            // pickup district — same matching rule as POST /api/deliveries
            // (kept in sync manually since this is a second creation path).
            let { data: matchedVehicles } = await (db.from as any)('vehicles')
              .select('user_id')
              .eq('is_available', true)
              .gte('capacity_kg', Number(order.quantity_kg))
              .contains('districts', [order.pickup_district])
              .limit(50);
            if (!matchedVehicles || matchedVehicles.length === 0) {
              const res = await (db.from as any)('vehicles')
                .select('user_id')
                .eq('is_available', true)
                .gte('capacity_kg', Number(order.quantity_kg))
                .limit(50);
              matchedVehicles = res.data;
            }
            const driverUserIds = [...new Set<string>((matchedVehicles ?? []).map((v: any) => v.user_id as string))];
            if (driverUserIds.length > 0) {
              await (db.from as any)('driver_assignments').insert(
                driverUserIds.map((driverId: string) => ({ delivery_id: dr.id, driver_id: driverId, status: 'pending' })),
              );
              const deliveryBody = `🚛 Standard · ${order.quantity_kg}kg from ${order.pickup_district} → ${dropoff} · UGX ${fare.totalFare.toLocaleString()}`;
              await (db.from as any)('notifications').insert(
                driverUserIds.map((driverId: string) => ({
                  user_id: driverId, role: 'transporter', type: 'delivery', title: 'New Delivery Request',
                  body: deliveryBody,
                  read: false,
                })),
              );
              await sendPushToUsers(driverUserIds, {
                title: 'New Delivery Request',
                body:  deliveryBody,
                url:   '/transporter/job-queue',
                tag:   `delivery-${dr.id}`,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, escrowId });
  }

  // NOTE: release/refund/dispute for order-based escrow are handled by
  // PATCH /api/orders/[id] (action=complete/cancel/dispute) and
  // PATCH /api/admin/disputes (action=resolve), which both call the shared
  // helpers in src/lib/orders/escrow.ts — kept in one place so seller/
  // platform-wallet crediting logic can't drift between two implementations.

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
