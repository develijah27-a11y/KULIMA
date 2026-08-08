import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/groups/my-chats — every group_messages "room" (admin_id) the
// current user is a real member of, via group_members.farmer_id. This is
// the roster a "groups"-role leader builds by phone number — separate from
// farmer_group_members (the self-serve /farmer/groups system) — so it needs
// its own lookup rather than reusing /api/groups/my-members.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ rooms: [] });

  const { data: memberships, error } = await (supabase.from as any)('group_members')
    .select('admin_id')
    .eq('farmer_id', (myProfile as any).id)
    .eq('status', 'active');

  if (error) {
    console.error('[/api/groups/my-chats]', error);
    return NextResponse.json({ error: 'Failed to load your groups. Please try again.' }, { status: 500 });
  }

  const adminIds: string[] = Array.from(new Set((memberships ?? []).map((m: any) => m.admin_id)));
  if (adminIds.length === 0) return NextResponse.json({ rooms: [] });

  const { data: admins } = await supabase.from('profiles').select('user_id, full_name, location').in('user_id', adminIds);
  const rooms = adminIds.map(id => {
    const p = (admins ?? []).find((a: any) => a.user_id === id) as any;
    return { adminId: id, adminName: p?.full_name ?? 'Group Leader', district: p?.location ?? null };
  });

  return NextResponse.json({ rooms });
}
