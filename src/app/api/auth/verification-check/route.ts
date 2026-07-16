import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { notifyUser } from '@/lib/notify';

// Where tapping the "Verify your account" push notification should land,
// per role — each role manages KYC docs on its own dashboard.
const VERIFY_URL: Record<string, string> = {
  farmer: '/farmer/verify',
  buyer: '/buyer/verify',
  groups: '/groups/verify',
  supplier: '/supplier/verify',
  transporter: '/transporter/verify',
  offtaker: '/offtaker/verify',
  pathologist: '/pathologist/verify',
};

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

  const role = (profile as any)?.role ?? null;
  await notifyUser(admin, {
    userId: user.id,
    role,
    type: 'system',
    title: VERIFY_REMINDER_TITLE,
    body: 'Submit your national ID and other required documents to unlock jobs, payouts, and escrow-protected deals.',
    url: role && VERIFY_URL[role] ? VERIFY_URL[role] : undefined,
  });

  return NextResponse.json({ notified: true });
}
