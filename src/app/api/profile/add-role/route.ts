import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SELF_ADD_ROLES = new Set(['farmer', 'buyer', 'transporter', 'supplier', 'pathologist', 'offtaker', 'groups']);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { role } = body;

  if (!role || !SELF_ADD_ROLES.has(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('roles')
    .eq('user_id', user.id)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const currentRoles: string[] = profile.roles ?? [];
  if (currentRoles.includes(role)) {
    return NextResponse.json({ ok: true, roles: currentRoles });
  }

  const newRoles = [...currentRoles, role];
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ roles: newRoles })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('[/api/profile/add-role]', updateError);
    return NextResponse.json({ error: 'Failed to update your roles. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, roles: newRoles });
}
