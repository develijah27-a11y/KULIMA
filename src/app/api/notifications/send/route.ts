import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { type, title, body: message } = body;

  if (!title?.trim()) return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 });

  // notifications GET / the realtime bell both filter on user_id — a row
  // with only farmer_id set is invisible to the recipient (never appears in
  // the bell, drawer, or unread count).
  const { error } = await (supabase.from as any)('notifications').insert({
    farmer_id: (profile as any).id,
    user_id:   user.id,
    role:      (profile as any).role ?? null,
    type:      type ?? 'info',
    title:     title.trim(),
    body:      message ?? '',
    read:      false,
    sent_at:   new Date().toISOString(),
  });

  if (error) {
    console.error('[/api/notifications/send]', error);
    return NextResponse.json({ success: false, error: 'Failed to send notification. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
