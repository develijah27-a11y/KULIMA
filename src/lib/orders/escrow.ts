import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { notifyUser } from '@/lib/notify';

type AdminClient = SupabaseClient<Database>;

export async function getCommissionRate(db: AdminClient) {
  const { data } = await (db.from as any)('platform_commission')
    .select('rate_percent, min_fee_ugx, max_fee_ugx, platform_wallet_user_id')
    .eq('active', true)
    .single();
  return data ?? { rate_percent: 2.5, min_fee_ugx: 500, max_fee_ugx: null, platform_wallet_user_id: null };
}

export function computeFee(gross: number, commission: { rate_percent: number; min_fee_ugx: number; max_fee_ugx: number | null }) {
  let fee = Math.round(gross * commission.rate_percent / 100);
  if (fee < commission.min_fee_ugx) fee = commission.min_fee_ugx;
  if (commission.max_fee_ugx && fee > commission.max_fee_ugx) fee = commission.max_fee_ugx;
  return fee;
}

export async function creditPlatformWallet(
  db: AdminClient,
  platformWalletUserId: string | null,
  feeAmount: number,
  orderId: string,
  now: string,
) {
  if (!platformWalletUserId || feeAmount <= 0) return;
  const { data: platformWallet } = await (db.from as any)('wallets')
    .select('id').eq('user_id', platformWalletUserId).single();
  if (!platformWallet) return;
  // Atomic additive credit (credit_wallet RPC) instead of read-balance ->
  // compute -> write-balance — this is the platform's own commission
  // wallet, hit on every single order release, so it's the most exposed
  // wallet in the system to a lost-update race between two settlements.
  await Promise.all([
    (db as any).rpc('credit_wallet', { p_wallet_id: platformWallet.id, p_amount: feeAmount }),
    (db.from as any)('wallet_transactions').insert({
      wallet_id: platformWallet.id, user_id: platformWalletUserId,
      type: 'fee', amount: feeAmount, status: 'completed', order_id: orderId,
      description: 'Platform commission received',
    }),
  ]);
}

/**
 * Releases a funded escrow to the seller(s), net of platform commission, and
 * marks the order completed. Handles both individual sellers and group
 * listings (proportional split across group_listing_contributions).
 * Caller must already have verified the requester is authorized (buyer or
 * admin) and that order.status === 'delivered' (or 'disputed', for admin
 * resolution) before calling this.
 */
export async function releaseEscrowForOrder(db: AdminClient, orderId: string) {
  const { data: order } = await (db.from as any)('orders')
    .select('id, escrow_id, group_listing_id, crop_type, quantity_kg')
    .eq('id', orderId).single();
  if (!order) return { ok: false, error: 'Order not found' };
  if (!order.escrow_id) return { ok: false, error: 'No escrow on this order — nothing to release' };

  const now = new Date().toISOString();

  // Best-effort read just to know what to revert to if a later step fails —
  // not the actual concurrency guard (that's the atomic UPDATE below).
  const { data: priorEscrow } = await (db.from as any)('escrow_accounts')
    .select('status').eq('id', order.escrow_id).single();
  const priorStatus = priorEscrow?.status === 'disputed' ? 'disputed' : 'funded';

  // Atomically claim the escrow: this UPDATE only matches (and only one
  // concurrent caller can win) if status is still funded/disputed at write
  // time. Closes a double-release race — e.g. a double-tapped "Confirm
  // Receipt" on a slow connection, or an admin resolving the same dispute
  // twice — that would otherwise pay out the same escrow more than once.
  const { data: escrow } = await (db.from as any)('escrow_accounts')
    .update({ status: 'released', released_at: now })
    .eq('id', order.escrow_id)
    .in('status', ['funded', 'disputed'])
    .select('*')
    .single();
  if (!escrow) return { ok: false, error: 'Escrow not found or already processed' };

  const revertClaim = () => (db.from as any)('escrow_accounts')
    .update({ status: priorStatus, released_at: null }).eq('id', escrow.id);

  const commission = await getCommissionRate(db);
  const gross = Number(escrow.amount);
  const fee = computeFee(gross, commission);
  const net = gross - fee;

  // ── Group listing: split payout proportionally across contributing members ──
  if (order.group_listing_id) {
    const { data: groupListing } = await (db.from as any)('group_listings')
      .select('admin_id').eq('id', order.group_listing_id).single();

    if (groupListing) {
      const adminId = groupListing.admin_id;
      const { data: contributions } = await (db.from as any)('group_listing_contributions')
        .select('farmer_id, quantity_kg').eq('group_listing_id', order.group_listing_id);

      if (contributions && contributions.length > 0) {
        const totalKg = contributions.reduce((s: number, c: any) => s + Number(c.quantity_kg), 0);

        for (const c of contributions) {
          const share = Math.round(net * (Number(c.quantity_kg) / totalKg));
          if (share <= 0) continue;

          const { data: memberProfile } = await (db.from as any)('profiles')
            .select('user_id').eq('id', c.farmer_id).single();
          if (!memberProfile) {
            // Escrow is already claimed and this member's share can't just
            // vanish silently — surface it to admins instead of losing it.
            await (db.from as any)('notifications').insert({
              type: 'alert', title: `Group payout could not reach a member — order #${orderId.slice(0, 8)}`,
              body: `Contribution ${c.farmer_id} has no linked profile. UGX ${share.toLocaleString()} was not paid out — needs manual resolution.`,
              data: { order_id: orderId, farmer_id: c.farmer_id },
            });
            continue;
          }

          const { data: memberWallet } = await (db.from as any)('wallets')
            .select('id, is_frozen').eq('user_id', memberProfile.user_id).single();
          if (!memberWallet) {
            await (db.from as any)('notifications').insert({
              type: 'alert', title: `Group payout could not reach a member — order #${orderId.slice(0, 8)}`,
              body: `Member ${memberProfile.user_id} has no wallet. UGX ${share.toLocaleString()} was not paid out — needs manual resolution.`,
              data: { order_id: orderId, user_id: memberProfile.user_id },
            });
            continue;
          }
          if (memberWallet.is_frozen) {
            await (db.from as any)('notifications').insert({
              type: 'alert', title: `Group payout blocked — frozen wallet — order #${orderId.slice(0, 8)}`,
              body: `Member ${memberProfile.user_id}'s wallet is frozen. UGX ${share.toLocaleString()} was withheld — needs manual resolution.`,
              data: { order_id: orderId, user_id: memberProfile.user_id },
            });
            continue;
          }

          await Promise.all([
            (db as any).rpc('credit_wallet', { p_wallet_id: memberWallet.id, p_amount: share }),
            (db.from as any)('wallet_transactions').insert({
              wallet_id: memberWallet.id, user_id: memberProfile.user_id,
              type: 'payout', amount: share, status: 'completed', order_id: orderId,
              description: `Group sale payout — ${c.quantity_kg}kg contributed (${commission.rate_percent}% fee deducted)`,
            }),
          ]);
          // Notify outside the financial Promise.all — a notification-insert
          // failure must never look like the payout itself failed (the
          // wallet credit above has already committed by this point).
          notifyUser(db, {
            userId: memberProfile.user_id, role: 'farmer', type: 'payment',
            title: 'Group sale payout received',
            body: `UGX ${share.toLocaleString()} added to your wallet for your ${c.quantity_kg}kg contribution.`,
            data: { order_id: orderId },
            url: '/farmer/wallet',
          }).catch(() => {});
        }

        await creditPlatformWallet(db, commission.platform_wallet_user_id, fee, orderId, now);
        // type is 'sale_payout_split' (not 'sale_payout') because this money
        // was paid directly into each member's own wallet, not into
        // farmer_groups.wallet_balance — the group wallet page must not sum
        // this into its balance-affecting totals or it'll look like the pool
        // grew by an amount it never actually received.
        await (db.from as any)('group_wallet_transactions').insert({
          group_admin_id: adminId, order_id: orderId, type: 'sale_payout_split', amount: net,
          description: `Group sale — split across ${contributions.length} contributing member(s) (${commission.rate_percent}% fee deducted)`,
        });
        await (db.from as any)('orders').update({ status: 'completed', completed_at: now, updated_at: now }).eq('id', orderId);

        return { ok: true, net, fee };
      }

      // Fallback: no per-member contributions recorded — credit the pooled group wallet.
      const { data: leaderProfile } = await (db.from as any)('profiles')
        .select('id').eq('user_id', adminId).single();
      const { data: farmGroup } = leaderProfile
        ? await (db.from as any)('farmer_groups').select('id, wallet_balance').eq('leader_id', leaderProfile.id).single()
        : { data: null };

      if (farmGroup) {
        await Promise.all([
          (db as any).rpc('credit_group_wallet', { p_group_id: farmGroup.id, p_amount: net }),
          (db.from as any)('group_wallet_transactions').insert({
            group_admin_id: adminId, order_id: orderId, type: 'sale_payout', amount: net,
            description: `Group sale payout (${commission.rate_percent}% fee deducted)`,
          }),
        ]);
        notifyUser(db, {
          userId: adminId, role: 'groups', type: 'payment', title: 'Group sale proceeds received',
          body: `UGX ${net.toLocaleString()} added to your group wallet (after ${commission.rate_percent}% platform fee).`,
          data: { order_id: orderId },
          url: '/groups/wallet',
        }).catch(() => {});
        await creditPlatformWallet(db, commission.platform_wallet_user_id, fee, orderId, now);
        await (db.from as any)('orders').update({ status: 'completed', completed_at: now, updated_at: now }).eq('id', orderId);
        return { ok: true, net, fee };
      }
    }
  }

  // ── Individual seller ──
  const { data: sellerWallet } = await (db.from as any)('wallets')
    .select('id, is_frozen').eq('user_id', escrow.seller_user_id).single();
  if (!sellerWallet) {
    await revertClaim();
    return { ok: false, error: 'Seller wallet not found' };
  }
  if (sellerWallet.is_frozen) {
    await revertClaim();
    return { ok: false, error: 'Seller wallet is frozen — payout blocked pending review' };
  }

  await Promise.all([
    (db as any).rpc('credit_wallet', { p_wallet_id: sellerWallet.id, p_amount: net }),
    (db.from as any)('wallet_transactions').insert([
      { wallet_id: sellerWallet.id, user_id: escrow.seller_user_id, type: 'payout', amount: net, status: 'completed', order_id: orderId, description: `Payout for order (${commission.rate_percent}% fee deducted)` },
      { wallet_id: sellerWallet.id, user_id: escrow.seller_user_id, type: 'fee',    amount: fee, status: 'completed', order_id: orderId, description: `Platform fee (${commission.rate_percent}%)` },
    ]),
  ]);
  notifyUser(db, {
    userId: escrow.seller_user_id, role: 'farmer', type: 'payment', title: 'Payment released to your wallet',
    body: `UGX ${net.toLocaleString()} has been added to your wallet (after ${commission.rate_percent}% platform fee).`,
    data: { order_id: orderId },
    url: '/farmer/wallet',
  }).catch(() => {});
  await creditPlatformWallet(db, commission.platform_wallet_user_id, fee, orderId, now);
  await (db.from as any)('orders').update({ status: 'completed', completed_at: now, updated_at: now }).eq('id', orderId);

  return { ok: true, net, fee };
}

/**
 * Refunds a funded/disputed escrow back to the buyer and marks the order
 * cancelled. Caller must already have verified authorization.
 */
export async function refundEscrowForOrder(db: AdminClient, orderId: string, cancelledStatus: 'cancelled' | 'disputed' = 'cancelled') {
  const { data: order } = await (db.from as any)('orders').select('id, escrow_id').eq('id', orderId).single();
  if (!order) return { ok: false, error: 'Order not found' };
  if (!order.escrow_id) return { ok: true, skipped: true };

  // Atomically claim the escrow — see releaseEscrowForOrder for why this must
  // be a single UPDATE...WHERE rather than a read-then-write.
  const { data: escrow } = await (db.from as any)('escrow_accounts')
    .update({ status: 'refunded' })
    .eq('id', order.escrow_id)
    .in('status', ['funded', 'disputed'])
    .select('*')
    .single();
  if (!escrow) return { ok: true, skipped: true };

  const { data: buyerWallet } = await (db.from as any)('wallets')
    .select('id').eq('user_id', escrow.buyer_user_id).single();
  if (!buyerWallet) {
    await (db.from as any)('escrow_accounts')
      .update({ status: cancelledStatus === 'disputed' ? 'disputed' : 'funded' }).eq('id', escrow.id);
    return { ok: false, error: 'Buyer wallet not found' };
  }

  const now = new Date().toISOString();
  const refundAmount = Number(escrow.amount);

  await Promise.all([
    (db as any).rpc('credit_wallet', { p_wallet_id: buyerWallet.id, p_amount: refundAmount }),
    (db.from as any)('wallet_transactions').insert({
      wallet_id: buyerWallet.id, user_id: escrow.buyer_user_id,
      type: 'escrow_refund', amount: refundAmount, status: 'completed', order_id: orderId,
      description: cancelledStatus === 'disputed' ? 'Refund: dispute resolved in buyer\'s favor' : 'Refund: order cancelled',
    }),
  ]);
  notifyUser(db, {
    userId: escrow.buyer_user_id, type: 'payment', title: 'Refund issued',
    body: `UGX ${refundAmount.toLocaleString()} has been refunded to your wallet.`,
    data: { order_id: orderId },
  }).catch(() => {});

  return { ok: true, refunded: refundAmount };
}
