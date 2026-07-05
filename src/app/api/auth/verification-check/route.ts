import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

// Called once right after a successful sign-in. If the user hasn't at least
// completed ID verification, nudge them with a notification — but only once
// per 24h so it doesn't spam every login.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await (admin.from as any)('profiles')
    .select('verification_level, role')
    .eq('user_id', user.id)
    .single();

  const level = profile?.verification_level ?? 'none';
  if (level === 'green' || level === 'blue' || level === 'gold') {
    return NextResponse.json({ notified: false });
  }

  const VERIFY_REMINDER_TITLE = 'Verify your account';
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await (admin.from as any)('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('title', VERIFY_REMINDER_TITLE)
    .gte('created_at', dayAgo)
    .maybeSingle();

  if (recent) return NextResponse.json({ notified: false });

  await (admin.from as any)('notifications').insert({
    user_id: user.id,
    type: 'system',
    title: VERIFY_REMINDER_TITLE,
    body: 'Submit your national ID and other required documents to unlock jobs, payouts, and escrow-protected deals.',
    read: false,
  });

  return NextResponse.json({ notified: true });
}
