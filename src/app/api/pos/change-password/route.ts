import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { newPassword } = await req.json();
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Users can always change their own password via the session client —
  // no service-role needed for this part.
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // pos_staff RLS only lets a staff member SELECT their own row, not
  // UPDATE it (writes are owner/service-role only) — clearing the flag
  // needs the service-role client.
  const admin = createServiceRoleClient();
  await (admin.from as any)('pos_staff').update({ must_change_password: false }).eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
