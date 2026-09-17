import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { message: 'Not authenticated' } }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawRole = searchParams.get('role');
  const role = rawRole ? rawRole.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 32) : null;

  let query = supabase.from('notifications').select('*').eq('user_id', user.id);
  // Strict dashboard isolation: each active dashboard must ONLY receive notifications scoped to its specific role.
  if (role) {
    query = query.eq('role', role);
  }
  const { data } = await query.order('created_at', { ascending: false }).limit(60);

  return NextResponse.json(
    { success: true, data: (data ?? []).map(normalizeNotif) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  let id: string | undefined;
  let rawRole: string | undefined;
  try { ({ id, role: rawRole } = await req.json()); } catch { /* no body — mark-all path */ }
  const role = rawRole ? String(rawRole).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 32) : undefined;

  const query = supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
  if (id) {
    await query.eq('id', id);
  } else if (role) {
    await query.eq('read', false).eq('role', role);
  } else {
    await query.eq('read', false);
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, role, title: t, message: m, data } = body;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await notifyUser(supabase, {
      userId: user.id,
      role: role ?? null,
      type: type || 'system',
      title: t ?? '',
      body: m ?? '',
      data,
    });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}

function normalizeNotif(n: any) {
  const ts = n.created_at || n.sent_at || new Date().toISOString();
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    role: n.role ?? null,
    read: n.read,
    data: n.data ?? null,
    href: n.data?.url ?? n.data?.href ?? n.href ?? null,
    created_at: ts,
    createdAt: ts,
    sentAt: n.sent_at || ts,
  };
}
