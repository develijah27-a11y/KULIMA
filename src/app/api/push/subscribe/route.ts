import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — save a browser's push subscription so the server can send it
// notifications later. Called once the user grants Notification permission
// and the client has subscribed via the Push API.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 });
  }

  const { error } = await (supabase.from as any)('push_subscriptions').upsert({
    user_id:  user.id,
    endpoint,
    p256dh:   keys.p256dh,
    auth:     keys.auth,
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error('[/api/push/subscribe]', error);
    return NextResponse.json({ success: false, error: 'Failed to save subscription' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE — remove a subscription, e.g. when the user turns notifications off.
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ success: false, error: 'endpoint required' }, { status: 400 });

  await (supabase.from as any)('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  return NextResponse.json({ success: true });
}
