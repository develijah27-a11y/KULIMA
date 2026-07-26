import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { releaseEscrowForOrder, refundEscrowForOrder } from '@/lib/orders/escrow';
import { notifyUsers } from '@/lib/notify';
import { withApiLogging, logSystemEvent } from '@/lib/system-log';

const ACTION_MAP: Record<string, { status: string; extraFields?: Record<string, unknown> }> = {
  review:  { status: 'under_review' },
  resolve: { status: 'resolved', extraFields: { resolved_at: new Date().toISOString() } },
  close:   { status: 'closed' },
};

async function handlePATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, action, outcome } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  const transition = ACTION_MAP[action];
  if (!transition) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  // Resolving a dispute must actually settle the money — otherwise the order
  // stays stuck 'disputed' and escrow stays frozen forever with no visible
  // trace that anything happened.
  if (action === 'resolve') {
    if (outcome !== 'refund_buyer' && outcome !== 'release_to_farmer') {
      return NextResponse.json({ error: 'outcome must be "refund_buyer" or "release_to_farmer"' }, { status: 400 });
    }

    const { data: dispute } = await (supabase.from as any)('disputes').select('order_id').eq('id', id).single();
    if (!dispute?.order_id) {
      return NextResponse.json({ error: 'This dispute has no linked order — cannot settle funds automatically' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const result = outcome === 'refund_buyer'
      ? await refundEscrowForOrder(admin as any, dispute.order_id, 'disputed')
      : await releaseEscrowForOrder(admin as any, dispute.order_id);

    if (!result.ok) {
      logSystemEvent({
        category: 'failed_payment',
        level: 'error',
        route: '/api/admin/disputes',
        method: 'PATCH',
        userId: user.id,
        message: `Dispute settlement failed: ${result.error ?? 'unknown error'}`,
        metadata: { disputeId: id, orderId: dispute.order_id, outcome },
      });
      return NextResponse.json({ error: result.error ?? 'Failed to settle order' }, { status: 500 });
    }

    if (outcome === 'refund_buyer') {
      await (admin.from as any)('orders').update({
        status: 'cancelled', cancelled_at: new Date().toISOString(),
      }).eq('id', dispute.order_id);
    }

    await (supabase.from as any)('disputes').update({
      status: transition.status,
      resolution: outcome === 'refund_buyer' ? 'Refunded to buyer' : 'Released to farmer',
      resolved_at: new Date().toISOString(),
    }).eq('id', id);

    // A dispute resolution moves real money — both sides need to be told
    // what was decided, not just find out from their balance changing.
    // orders has no seller_id column — the farmer side is farmer_profile_id,
    // which points at profiles.id, not auth.users.id, so it has to be
    // resolved separately before it can be used as a notification userId.
    const { data: order } = await (admin.from as any)('orders').select('buyer_id, farmer_profile_id, crop_type').eq('id', dispute.order_id).single();
    const { data: farmerProfile } = order?.farmer_profile_id
      ? await (admin.from as any)('profiles').select('user_id').eq('id', order.farmer_profile_id).single()
      : { data: null };
    const sellerUserId = farmerProfile?.user_id;

    if (order?.buyer_id && sellerUserId) {
      const refundedBuyer = outcome === 'refund_buyer';
      await notifyUsers(admin, [
        {
          userId: order.buyer_id,
          type: 'payment',
          title: refundedBuyer ? 'Dispute resolved — you were refunded' : 'Dispute resolved — funds released to seller',
          body: refundedBuyer
            ? `Your dispute over ${order.crop_type ?? 'this order'} was resolved in your favour. The escrowed amount has been refunded to your wallet.`
            : `Your dispute over ${order.crop_type ?? 'this order'} was resolved. The escrowed amount has been released to the seller.`,
          data: { order_id: dispute.order_id, dispute_id: id, outcome },
          url: '/buyer/orders',
        },
        {
          userId: sellerUserId,
          type: 'payment',
          title: refundedBuyer ? 'Dispute resolved — order refunded to buyer' : 'Dispute resolved — you were paid',
          body: refundedBuyer
            ? `The dispute over ${order.crop_type ?? 'this order'} was resolved in the buyer's favour. The escrowed amount was refunded to them.`
            : `The dispute over ${order.crop_type ?? 'this order'} was resolved in your favour. The escrowed amount has been released to your wallet.`,
          data: { order_id: dispute.order_id, dispute_id: id, outcome },
          url: '/farmer/orders',
        },
      ]);
    }

    return NextResponse.json({ success: true, status: transition.status });
  }

  const { error } = await (supabase.from as any)('disputes').update({
    status: transition.status,
    updated_at: new Date().toISOString(),
    ...(transition.extraFields ?? {}),
  }).eq('id', id);

  if (error) {
    console.error('[/api/admin/disputes]', error);
    return NextResponse.json({ error: 'Failed to update dispute. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, status: transition.status });
}

export const PATCH = withApiLogging('/api/admin/disputes', handlePATCH);
