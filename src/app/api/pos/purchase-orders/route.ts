import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';

interface POItem {
  productId: string | null;
  productName: string;
  quantity: number;
  unitCostUgx?: number | null;
}

async function requireEnterpriseSupplier(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles').select('id, role, roles, subscription_tier, role_subscription_tiers').eq('user_id', userId).single();
  const isSupplier = profile?.role === 'supplier' || (profile?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return { error: 'Only suppliers can manage purchase orders', status: 403 } as const;
  if (getEffectiveTier(profile, 'supplier') !== 'enterprise') {
    return { error: 'Purchase orders require the Enterprise plan.', status: 403 } as const;
  }
  return { profile } as const;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const check = await requireEnterpriseSupplier(supabase, user.id);
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const admin = createServiceRoleClient();
  const { data, error } = await (admin.from as any)('pos_purchase_orders')
    .select('id, vendor_name, status, notes, expected_date, received_at, created_at, pos_purchase_order_items(id, product_name, quantity, unit_cost_ugx)')
    .eq('supplier_id', check.profile.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ purchaseOrders: [] });
  return NextResponse.json({ purchaseOrders: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const check = await requireEnterpriseSupplier(supabase, user.id);
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { vendorName, items, notes, expectedDate } = await req.json();
  const poItems: POItem[] = Array.isArray(items) ? items : [];
  if (!vendorName?.trim()) return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
  if (poItems.length === 0) return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: store } = await (admin.from as any)('stores')
    .select('id').eq('supplier_id', check.profile.id).eq('is_primary', true).maybeSingle();
  if (!store) return NextResponse.json({ error: 'No store found for your account' }, { status: 400 });

  const { data: po, error } = await (admin.from as any)('pos_purchase_orders').insert({
    store_id: store.id, supplier_id: check.profile.id, vendor_name: vendorName.trim(),
    status: 'ordered', notes: notes ?? null, expected_date: expectedDate ?? null,
  }).select('id').single();
  if (error || !po) return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 });

  await (admin.from as any)('pos_purchase_order_items').insert(
    poItems.map(i => ({
      purchase_order_id: po.id, product_id: i.productId ?? null, product_name: i.productName,
      quantity: i.quantity, unit_cost_ugx: i.unitCostUgx ?? null,
    })),
  );

  return NextResponse.json({ success: true, purchaseOrderId: po.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const check = await requireEnterpriseSupplier(supabase, user.id);
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id, action } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: po } = await (admin.from as any)('pos_purchase_orders').select('id').eq('id', id).eq('supplier_id', check.profile.id).maybeSingle();
  if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });

  if (action === 'receive') {
    // Bumps stock_qty for every matched line item + marks received, all in
    // one transaction — the one place in this whole POS system that ADDS
    // stock rather than claiming it.
    const { error } = await (admin as any).rpc('receive_purchase_order', { p_purchase_order_id: id });
    if (error) return NextResponse.json({ error: 'Failed to receive purchase order' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'cancel') {
    await (admin.from as any)('pos_purchase_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
