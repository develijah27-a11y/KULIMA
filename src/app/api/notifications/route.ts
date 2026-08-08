import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { message: 'Not authenticated' } }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');

  let query = supabase.from('notifications').select('*').eq('user_id', user.id);
  if (role) query = query.or(`role.eq.${role},role.is.null`);
  const { data } = await query.order('sent_at', { ascending: false }).limit(20);

  // This list mutates on every mark-read click — a 30s browser cache meant a
  // notification you'd just read could come back as unread if you reopened
  // the bell within that window, since the fetch replayed the stale response
  // instead of asking the server again.
  return NextResponse.json(
    { success: true, data: (data ?? []).map(normalizeNotif) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  // With an id: mark just that notification read (scoped to the caller via
  // user_id, so one user can't mark another's notification read). Without
  // one: mark everything unread as read *for the active role only* — the
  // client already sends { role: currentRole } (see NotificationBell's
  // markAllRead), but it was being silently dropped here, so opening one
  // dashboard's bell and hitting "mark all read" was clearing every other
  // role's unread notifications too.
  let id: string | undefined;
  let role: string | undefined;
  try { ({ id, role } = await req.json()); } catch { /* no body — mark-all path */ }

  const query = supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
  if (id) {
    await query.eq('id', id);
  } else {
    await (role ? query.eq('read', false).or(`role.eq.${role},role.is.null`) : query.eq('read', false));
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, target, title: t, message: m } = body;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await notifyUser(supabase, { userId: user.id, type, title: t ?? '', body: m ?? '' });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}

function normalizeNotif(n: any) { return { id: n.id, userId: n.user_id, type: n.type, title: n.title, body: n.body, sentAt: n.sent_at, read: n.read }; }
