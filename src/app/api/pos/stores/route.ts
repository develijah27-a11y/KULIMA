import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';
import { getPosActor } from '@/lib/pos/getPosActor';

// Multi-branch is an Enterprise-tier feature. Owner/staff can both list
// stores (a staff member needs the list for the till's store-switcher),
// but only the owner on Enterprise can create/edit one.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceRoleClient();
  const actor = await getPosActor(admin, user.id);
  if (!actor) return NextResponse.json({ error: 'Only suppliers and store staff can view stores' }, { status: 403 });

  const { data, error } = await (admin.from as any)('stores')
    .select('id, name, is_primary, district, address, phone, is_active')
    .eq('supplier_id', actor.ownerId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ stores: [] });
  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('id, role, roles, subscription_tier, role_subscription_tiers').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can manage stores' }, { status: 403 });

  if (getEffectiveTier(profile as any, 'supplier') !== 'enterprise') {
    return NextResponse.json({ error: 'Multiple branches require the Enterprise plan.' }, { status: 403 });
  }

  const { name, district, address, phone } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data, error } = await (admin.from as any)('stores').insert({
    supplier_id: (profile as any).id,
    name: name.trim(),
    district: district ?? null,
    address: address ?? null,
    phone: phone ?? null,
    is_primary: false,
  }).select().single();

  if (error) {
    console.error('[/api/pos/stores POST]', error);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
  return NextResponse.json({ success: true, store: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, role, roles').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can manage stores' }, { status: 403 });

  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const allowed = ['name', 'district', 'address', 'phone', 'is_active'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  const admin = createServiceRoleClient();
  const { error } = await (admin.from as any)('stores').update(update).eq('id', id).eq('supplier_id', (profile as any).id);
  if (error) return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  return NextResponse.json({ success: true });
}
