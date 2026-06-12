import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { message: 'Not authenticated' } }, { status: 401 });

  const { data } = await supabase.from('notifications').select('*').order('sent_at', { ascending: false }).limit(20);
  return NextResponse.json(
    { success: true, data: (data ?? []).map(normalizeNotif) },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
  );
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  await supabase.from('notifications').update({ read: true }).eq('read', false);
  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, target, title: t, message: m } = body;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ success: false }, { status: 404 });
    await supabase.from('notifications').insert({ farmer_id: profile.id, type, title: t ?? '', body: m ?? '', sent_at: new Date().toISOString(), read: false });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}

function normalizeNotif(n: any) { return { id: n.id, farmerId: n.farmer_id, type: n.type, title: n.title, body: n.body, sentAt: n.sent_at, read: n.read }; }
