import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/supplier-orders/[id]/quote — the agro dealer names their
// discounted price for a bulk order request. This is the whole point of the
// bulk-order flow: the dealer decides the discount based on the quantity
// requested, rather than the buyer paying a fixed catalogue price.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { unitPrice } = await req.json();
  if (!unitPrice || isNaN(+unitPrice) || +unitPrice <= 0) {
    return NextResponse.json({ error: 'Enter a valid quoted price per unit' }, { status: 400 });
  }

  const { data: order } = await (supabase.from as any)('supplier_orders')
    .select('id, supplier_id, buyer_id, requested_quantity, product_name, unit, is_bulk_order, status')
    .eq('id', id)
    .eq('supplier_id', profile.id)
    .eq('is_bulk_order', true)
    .single();

  if (!order) return NextResponse.json({ error: 'Bulk order request not found' }, { status: 404 });
  if (order.status !== 'quote_requested') {
    return NextResponse.json({ error: 'This request has already been quoted or resolved' }, { status: 400 });
  }

  const qty    = Number(order.requested_quantity ?? 0);
  const amount = Math.round(qty * +unitPrice);

  const { error } = await (supabase.from as any)('supplier_orders')
    .update({ status: 'quoted', unit_price: +unitPrice, quantity: qty, amount, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[/api/supplier-orders/[id]/quote]', error);
    return NextResponse.json({ error: 'Failed to submit quote. Please try again.' }, { status: 500 });
  }

  try {
    await notifyUser(supabase, {
      userId: order.buyer_id,
      role: 'groups',
      type: 'order',
      title: 'Your bulk order was quoted',
      body: `The dealer quoted UGX ${Math.round(+unitPrice).toLocaleString()}/${order.unit} for ${qty}${order.unit} of ${order.product_name} — total UGX ${amount.toLocaleString()}. Review and confirm.`,
      url: '/groups/bulk-orders',
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true });
}
