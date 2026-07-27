import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';

const BUSINESS_TIER_STAFF_CAP = 5; // matches the advertised "Staff accounts (up to 5 users)" on the Business plan
const VALID_PERMISSIONS = ['checkout', 'refund', 'discount', 'view_reports', 'manage_inventory'];

function generateTempPassword() {
  // 10 chars, unambiguous alphabet (no 0/O/1/I/l) — read aloud over the
  // phone or written on paper without confusion, matches the decision to
  // relay this verbally/SMS rather than via an email link.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, role, roles').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can manage staff' }, { status: 403 });

  const { data, error } = await (supabase.from as any)('pos_staff')
    .select('id, full_name, phone, permissions, is_active, must_change_password, created_at, disabled_at')
    .eq('owner_id', (profile as any).id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ staff: [] });
  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('id, role, roles, subscription_tier, role_subscription_tiers').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can manage staff' }, { status: 403 });

  // Staff accounts are a Business/Enterprise-tier feature — gated here, not
  // by a DB constraint, since tier is a renewable subscription state.
  const tier = getEffectiveTier(profile as any, 'supplier');
  if (tier !== 'business' && tier !== 'enterprise') {
    return NextResponse.json({ error: 'Staff accounts require the Business plan or higher. Upgrade from Settings → Business.' }, { status: 403 });
  }

  const { email, fullName, phone, permissions } = await req.json();
  if (!email || !fullName) return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
  const perms: string[] = Array.isArray(permissions) && permissions.length > 0
    ? permissions.filter((p: string) => VALID_PERMISSIONS.includes(p))
    : ['checkout'];

  const admin = createServiceRoleClient();

  if (tier === 'business') {
    const { count } = await (admin.from as any)('pos_staff')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', (profile as any).id)
      .eq('is_active', true);
    if ((count ?? 0) >= BUSINESS_TIER_STAFF_CAP) {
      return NextResponse.json({ error: `Business plan is limited to ${BUSINESS_TIER_STAFF_CAP} staff accounts. Upgrade to Enterprise for unlimited staff.` }, { status: 403 });
    }
  }

  const { data: store } = await (admin.from as any)('stores')
    .select('id').eq('supplier_id', (profile as any).id).eq('is_primary', true).maybeSingle();
  if (!store) return NextResponse.json({ error: 'No store found for your account. Add a product first.' }, { status: 400 });

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await (admin.auth as any).admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create staff login' }, { status: 400 });
  }

  const newUserId = created.user.id;

  // pos_staff is deliberately isolated from every marketplace role list
  // (RoleSwitcher/TopBar's SELF_ADD_ROLES, /onboarding/role) — a staff
  // account never touches any /supplier/*, /farmer/*, etc. dashboard.
  const { error: profileErr } = await (admin.from as any)('profiles').insert({
    user_id: newUserId, role: 'pos_staff', roles: ['pos_staff'], full_name: fullName,
  });
  if (profileErr) {
    await (admin.auth as any).admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Failed to create staff profile' }, { status: 500 });
  }

  const { data: staffRow, error: staffErr } = await (admin.from as any)('pos_staff').insert({
    user_id: newUserId, owner_id: (profile as any).id, store_id: store.id,
    full_name: fullName, phone: phone ?? null, permissions: perms,
  }).select('id').single();
  if (staffErr) {
    await (admin.auth as any).admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Failed to create staff record' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    staffId: staffRow.id,
    email,
    tempPassword, // shown once — relay to the worker directly, not emailed
  }, { status: 201 });
}
