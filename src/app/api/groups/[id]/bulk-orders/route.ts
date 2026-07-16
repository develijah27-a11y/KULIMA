import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

async function requireLeader(supabase: any, groupId: string, userId: string) {
  const { data: myProfile } = await supabase.from('profiles').select('id, full_name, district').eq('user_id', userId).single();
  if (!myProfile) return null;
  const { data: group } = await supabase.from('farmer_groups').select('id, name, leader_id').eq('id', groupId).single();
  if (!group || group.leader_id !== myProfile.id) return null;
  return { myProfile, group };
}

// GET /api/groups/[id]/bulk-orders — the group leader's own bulk order
// requests and their quote status.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await requireLeader(supabase, groupId, user.id);
  if (!ctx) return NextResponse.json({ error: 'Only the group leader can view bulk orders' }, { status: 403 });

  const { data, error } = await (supabase.from as any)('supplier_orders')
    .select('id, product_name, unit, requested_quantity, quantity, unit_price, amount, status, notes, created_at, supplier:profiles!supplier_orders_supplier_id_fkey(full_name)')
    .eq('group_id', groupId)
    .eq('is_bulk_order', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[/api/groups/[id]/bulk-orders GET]', error);
    return NextResponse.json({ error: 'Failed to load bulk orders. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ orders: data ?? [] });
}

// POST /api/groups/[id]/bulk-orders — group leader requests a large
// quantity from a registered agro dealer's catalogue product. No fixed
// discount tier — the dealer reviews and names their own quoted price.
export async function POST(req: Request, { params }: Ctx) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await requireLeader(supabase, groupId, user.id);
  if (!ctx) return NextResponse.json({ error: 'Only the group leader can request a bulk order' }, { status: 403 });

  const { productId, requestedQuantity, notes } = await req.json();
  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
  if (!requestedQuantity || isNaN(+requestedQuantity) || +requestedQuantity <= 0) {
    return NextResponse.json({ error: 'Enter a valid quantity' }, { status: 400 });
  }

  const { data: product } = await (supabase.from as any)('supplier_products')
    .select('id, supplier_id, name, unit, price_per_unit, is_available')
    .eq('id', productId)
    .single();
  if (!product || !product.is_available) return NextResponse.json({ error: 'Product not available' }, { status: 404 });

  // Estimate at today's catalogue price until the dealer quotes their
  // bulk-discounted rate — shown to the leader as a placeholder, not a
  // commitment from the dealer.
  const estimatedAmount = Math.round(+requestedQuantity * product.price_per_unit);

  const { data: order, error } = await (supabase.from as any)('supplier_orders').insert({
    supplier_id:         product.supplier_id,
    buyer_id:            user.id,
    buyer_name:          ctx.myProfile.full_name ?? null,
    product_id:          product.id,
    product_name:        product.name,
    quantity:            +requestedQuantity,
    requested_quantity:  +requestedQuantity,
    unit:                product.unit,
    unit_price:          product.price_per_unit,
    amount:              estimatedAmount,
    district:            ctx.myProfile.district ?? null,
    notes:               notes ?? null,
    status:              'quote_requested',
    is_bulk_order:        true,
    group_id:            groupId,
    group_name:          ctx.group.name,
  }).select().single();

  if (error) {
    console.error('[/api/groups/[id]/bulk-orders POST]', error);
    return NextResponse.json({ error: 'Failed to submit bulk order request. Please try again.' }, { status: 500 });
  }

  try {
    const { data: supplierProfile } = await (supabase.from as any)('profiles').select('user_id').eq('id', product.supplier_id).single();
    if (supplierProfile?.user_id) {
      await notifyUser(supabase, {
        userId: supplierProfile.user_id,
        role: 'supplier',
        type: 'order',
        title: `Bulk order request — ${product.name}`,
        body: `${ctx.group.name} wants ${requestedQuantity} ${product.unit} of ${product.name}. Review and name your discounted price.`,
        data: { supplier_order_id: (order as any).id },
        url: '/supplier/orders',
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
