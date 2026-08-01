import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const VALID_PERMISSIONS = ['checkout', 'refund', 'discount', 'view_reports', 'manage_inventory'];

function generateTempPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, role, roles').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!profile || !isSupplier) return NextResponse.json({ error: 'Only suppliers can manage staff' }, { status: 403 });

  const admin = createServiceRoleClient();
  const { data: staff } = await (admin.from as any)('pos_staff')
    .select('id, user_id, owner_id, permissions').eq('id', id).eq('owner_id', (profile as any).id).maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === 'disable') {
    await Promise.all([
      (admin.from as any)('pos_staff').update({ is_active: false, disabled_at: new Date().toISOString() }).eq('id', id),
      (admin.auth as any).admin.updateUserById(staff.user_id, { ban_duration: '876000h' }), // ~100 years — effectively permanent until re-enabled
    ]);
    return NextResponse.json({ success: true });
  }

  if (action === 'enable') {
    await Promise.all([
      (admin.from as any)('pos_staff').update({ is_active: true, disabled_at: null }).eq('id', id),
      (admin.auth as any).admin.updateUserById(staff.user_id, { ban_duration: 'none' }),
    ]);
    return NextResponse.json({ success: true });
  }

  if (action === 'reset_password') {
    const tempPassword = generateTempPassword();
    const { error } = await (admin.auth as any).admin.updateUserById(staff.user_id, { password: tempPassword });
    if (error) return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    await (admin.from as any)('pos_staff').update({ must_change_password: true }).eq('id', id);
    return NextResponse.json({ success: true, tempPassword });
  }

  if (action === 'update_permissions') {
    const perms: string[] = Array.isArray(body.permissions) ? body.permissions.filter((p: string) => VALID_PERMISSIONS.includes(p)) : staff.permissions;
    await (admin.from as any)('pos_staff').update({ permissions: perms }).eq('id', id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
