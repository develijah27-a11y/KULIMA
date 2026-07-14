import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { releaseEscrowForOrder, refundEscrowForOrder } from '@/lib/orders/escrow';

const ACTION_MAP: Record<string, { status: string; extraFields?: Record<string, unknown> }> = {
  review:  { status: 'under_review' },
  resolve: { status: 'resolved', extraFields: { resolved_at: new Date().toISOString() } },
  close:   { status: 'closed' },
};

export async function PATCH(req: Request) {
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

    if (!result.ok) return NextResponse.json({ error: result.error ?? 'Failed to settle order' }, { status: 500 });

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
