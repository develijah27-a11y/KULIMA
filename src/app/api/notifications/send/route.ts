import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { type, title, body: message } = body;

  if (!title?.trim()) return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 });

  try {
    await notifyUser(supabase, {
      userId: user.id,
      role:   (profile as any).role ?? null,
      type:   type ?? 'info',
      title:  title.trim(),
      body:   message ?? '',
    });
  } catch (error) {
    console.error('[/api/notifications/send]', error);
    return NextResponse.json({ success: false, error: 'Failed to send notification. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
