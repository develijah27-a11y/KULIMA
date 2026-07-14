import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return data as { id: string } | null;
}

// GET — supplier sees all return requests for their orders
// GET — farmer sees their own return requests (via ?role=farmer)
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');

  let query = (supabase.from as any)('input_returns')
    .select('id, order_id, farmer_id, supplier_id, reason, quantity_returned, status, created_at, resolved_at, notes, supplier_note, order:supplier_orders(product_name, unit, quantity, amount)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (role === 'farmer') {
    query = query.eq('farmer_id', profile.id);
  } else {
    query = query.eq('supplier_id', profile.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ returns: [] });
  return NextResponse.json({ returns: data ?? [] });
}

// POST — farmer creates a return request
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { order_id, reason, quantity_returned } = await req.json();
  if (!order_id || !reason) {
    return NextResponse.json({ error: 'order_id and reason are required' }, { status: 400 });
  }

  // Verify the order belongs to this farmer and is delivered
  const { data: order } = await (supabase.from as any)('supplier_orders')
    .select('id, supplier_id, status, quantity, unit, product_name')
    .eq('id', order_id)
    .eq('buyer_id', profile.id)
    .single();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (!['delivered', 'confirmed'].includes(order.status)) {
    return NextResponse.json({ error: 'Can only return delivered or confirmed orders' }, { status: 400 });
  }

  // Check no existing pending return for this order
  const { data: existing } = await (supabase.from as any)('input_returns')
    .select('id')
    .eq('order_id', order_id)
    .in('status', ['pending', 'approved'])
    .single();

  if (existing) return NextResponse.json({ error: 'A return request already exists for this order' }, { status: 409 });

  const { data: ret, error: insertErr } = await (supabase.from as any)('input_returns').insert({
    order_id,
    farmer_id:          profile.id,
    supplier_id:        order.supplier_id,
    reason,
    quantity_returned:  quantity_returned ?? order.quantity,
    status:             'pending',
  }).select().single();

  if (insertErr) {
    console.error('[/api/supplier-orders/returns]', insertErr);
    return NextResponse.json({ error: 'Failed to submit return request. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: ret }, { status: 201 });
}

// PATCH — supplier approves/rejects return; updates status + supplier_note
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { id, status, supplier_note } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const allowed = ['approved', 'rejected'];
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const update: Record<string, unknown> = {
    status,
    resolved_at: new Date().toISOString(),
  };
  if (supplier_note) update.supplier_note = supplier_note;

  const { error } = await (supabase.from as any)('input_returns')
    .update(update)
    .eq('id', id)
    .eq('supplier_id', profile.id);

  if (error) {
    console.error('[/api/supplier-orders/returns]', error);
    return NextResponse.json({ error: 'Failed to update return request. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
