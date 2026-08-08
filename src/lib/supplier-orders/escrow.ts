import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { notifyUser } from '@/lib/notify';
import { getCommissionRate, computeFee, creditPlatformWallet } from '@/lib/orders/escrow';

type AdminClient = SupabaseClient<Database>;

/**
 * Releases a funded escrow to the supplier, net of platform commission, and
 * marks the order's payment_status 'released'. Mirrors releaseEscrowForOrder
 * (src/lib/orders/escrow.ts) but simplified — supplier orders never involve
 * a group-listing split, always exactly one seller. Caller must already have
 * verified the requester is authorized (the owning supplier) before calling.
 */
export async function releaseEscrowForSupplierOrder(db: AdminClient, supplierOrderId: string) {
  const { data: order } = await (db.from as any)('supplier_orders')
    .select('id, escrow_id, product_name, quantity, supplier_id')
    .eq('id', supplierOrderId).single();
  if (!order) return { ok: false, error: 'Order not found' };
  if (!order.escrow_id) return { ok: false, error: 'No escrow on this order — nothing to release' };

  const now = new Date().toISOString();

  // Atomic claim — only one concurrent caller can win this UPDATE, closing
  // the same double-release race releaseEscrowForOrder guards against.
  const { data: escrow } = await (db.from as any)('escrow_accounts')
    .update({ status: 'released', released_at: now })
    .eq('id', order.escrow_id)
    .in('status', ['funded', 'disputed'])
    .select('*')
    .single();
  if (!escrow) return { ok: false, error: 'Escrow not found or already processed' };

  const revertClaim = () => (db.from as any)('escrow_accounts')
    .update({ status: 'funded', released_at: null }).eq('id', escrow.id);

  const commission = await getCommissionRate(db);
  const gross = Number(escrow.amount);
  const fee = computeFee(gross, commission);
  const net = gross - fee;

  const { data: sellerWallet } = await (db.from as any)('wallets')
    .select('id, is_frozen').eq('user_id', escrow.seller_user_id).single();
  if (!sellerWallet) {
    await revertClaim();
    return { ok: false, error: 'Supplier wallet not found' };
  }
  if (sellerWallet.is_frozen) {
    await revertClaim();
    return { ok: false, error: 'Supplier wallet is frozen — payout blocked pending review' };
  }

  await Promise.all([
    (db as any).rpc('credit_wallet', { p_wallet_id: sellerWallet.id, p_amount: net }),
    (db.from as any)('wallet_transactions').insert([
      { wallet_id: sellerWallet.id, user_id: escrow.seller_user_id, type: 'payout', amount: net, status: 'completed', supplier_order_id: supplierOrderId, description: `Payout for input order (${commission.rate_percent}% fee deducted)` },
      { wallet_id: sellerWallet.id, user_id: escrow.seller_user_id, type: 'fee',    amount: fee, status: 'completed', supplier_order_id: supplierOrderId, description: `Platform fee (${commission.rate_percent}%)` },
    ]),
    (db.from as any)('supplier_orders').update({ payment_status: 'released' }).eq('id', supplierOrderId),
  ]);
  notifyUser(db, {
    userId: escrow.seller_user_id, role: 'supplier', type: 'payment', title: 'Payment released to your wallet',
    body: `UGX ${net.toLocaleString()} has been added to your wallet for ${order.quantity} ${order.product_name} (after ${commission.rate_percent}% platform fee).`,
    data: { supplier_order_id: supplierOrderId },
    url: '/supplier/wallet',
  }).catch(() => {});
  await creditPlatformWallet(db, commission.platform_wallet_user_id, fee, supplierOrderId, now);

  return { ok: true, net, fee };
}

/**
 * Refunds a funded/disputed escrow back to the buyer and marks the order's
 * payment_status 'refunded'. Caller must already have verified authorization
 * and should call release_product_stock separately (stock and payment are
 * independent claims here, unlike produce orders which don't reserve stock).
 */
export async function refundEscrowForSupplierOrder(db: AdminClient, supplierOrderId: string) {
  const { data: order } = await (db.from as any)('supplier_orders').select('id, escrow_id').eq('id', supplierOrderId).single();
  if (!order) return { ok: false, error: 'Order not found' };
  if (!order.escrow_id) return { ok: true, skipped: true };

  const { data: escrow } = await (db.from as any)('escrow_accounts')
    .update({ status: 'refunded' })
    .eq('id', order.escrow_id)
    .in('status', ['funded', 'disputed'])
    .select('*')
    .single();
  if (!escrow) return { ok: true, skipped: true };

  const { data: buyerWallet } = await (db.from as any)('wallets')
    .select('id, is_frozen').eq('user_id', escrow.buyer_user_id).single();
  if (!buyerWallet) {
    await (db.from as any)('escrow_accounts').update({ status: 'funded' }).eq('id', escrow.id);
    return { ok: false, error: 'Buyer wallet not found' };
  }
  if (buyerWallet.is_frozen) {
    await (db.from as any)('escrow_accounts').update({ status: 'funded' }).eq('id', escrow.id);
    return { ok: false, error: "Buyer's wallet is frozen. Contact support." };
  }

  const refundAmount = Number(escrow.amount);

  await Promise.all([
    (db as any).rpc('credit_wallet', { p_wallet_id: buyerWallet.id, p_amount: refundAmount }),
    (db.from as any)('wallet_transactions').insert({
      wallet_id: buyerWallet.id, user_id: escrow.buyer_user_id,
      type: 'escrow_refund', amount: refundAmount, status: 'completed', supplier_order_id: supplierOrderId,
      description: 'Refund: input order cancelled',
    }),
    (db.from as any)('supplier_orders').update({ payment_status: 'refunded' }).eq('id', supplierOrderId),
  ]);
  notifyUser(db, {
    userId: escrow.buyer_user_id, type: 'payment', title: 'Refund issued',
    body: `UGX ${refundAmount.toLocaleString()} has been refunded to your wallet.`,
    data: { supplier_order_id: supplierOrderId },
  }).catch(() => {});

  return { ok: true, refunded: refundAmount };
}
