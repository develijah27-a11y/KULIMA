import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUsers } from '@/lib/notify';

// Fired right after a user submits KYC documents (see VerifyWizard.tsx) —
// admins had no way to know a new submission was waiting other than
// checking the queue themselves. profiles' SELECT RLS blocks the caller
// (a non-admin) from reading admin rows directly, so this needs the
// service-role client to find who to notify, same pattern as the
// group-members phone lookup fixed earlier.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { level, role } = await req.json().catch(() => ({}));

  const { data: applicantProfile } = await supabase
    .from('profiles').select('full_name').eq('user_id', user.id).single();
  const applicantName = (applicantProfile as any)?.full_name ?? 'A user';

  const admin = createServiceRoleClient();
  const { data: admins } = await (admin.from as any)('profiles')
    .select('user_id')
    .or('role.eq.admin,roles.cs.{admin}');

  if (admins && admins.length > 0) {
    await notifyUsers(admin, admins.map((a: any) => ({
      userId: a.user_id,
      role: 'admin',
      type: 'kyc',
      title: 'New KYC submission',
      body: `${applicantName} submitted documents for ${level ?? ''} verification${role ? ` (${role})` : ''}. Review in the verification queue.`,
      url: '/admin/verification',
    })));
  }

  return NextResponse.json({ success: true });
}
