import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { notifyUsers } from '@/lib/notify';

const VALID_TYPES = ['rain', 'price', 'pest', 'offer', 'loan', 'system', 'delivery'] as const;
const VALID_ROLES = ['farmer', 'buyer', 'transporter', 'supplier', 'pathologist', 'offtaker', 'groups'] as const;

export async function POST(req: Request) {
  // Auth: must be admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { type, targetRole, title, body } = await req.json();

  if (!type || !title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'type, title, and body are required' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  // Use service role to read all profiles and insert notifications across RLS
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch target profile IDs. Dashboard access (and every layout's own
  // unread-notification query) is granted via profiles.roles[] — a
  // multi-role user reaches e.g. /supplier/dashboard whenever 'supplier' is
  // in their roles array, regardless of their singular primary `role`. This
  // used to filter on `role` alone, so switching-role users targeted by a
  // non-primary role never showed up here and never got the alert.
  let profileQuery = (adminClient.from as any)('profiles').select('id, role, roles, user_id');
  if (targetRole && targetRole !== 'all' && VALID_ROLES.includes(targetRole)) {
    profileQuery = profileQuery.or(`role.eq.${targetRole},roles.cs.{${targetRole}}`);
  }

  const { data: profiles, error: profileErr } = await profileQuery;
  if (profileErr) {
    console.error('[/api/admin/alert]', profileErr);
    return NextResponse.json({ error: 'Failed to load target profiles. Please try again.' }, { status: 500 });
  }

  const targetProfiles: any[] = profiles ?? [];
  if (targetProfiles.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Batch-insert notifications (chunks of 500 to stay within Postgres limits)
  const CHUNK = 500;
  let totalSent = 0;

  for (let i = 0; i < targetProfiles.length; i += CHUNK) {
    const chunk = targetProfiles.slice(i, i + CHUNK);
    const rows = chunk.map((p: any) => ({
      userId: p.user_id,  // GET /api/notifications and the realtime bell filter on user_id
      // Pin to the role the admin actually targeted, not the recipient's own
      // primary `role` column — for a multi-role user those can differ, and
      // every dashboard's badge/list filters by `role.eq.<that dashboard>`,
      // so this must match the dashboard the alert is meant to appear on.
      role: targetRole && targetRole !== 'all' ? targetRole : (p.role ?? null),
      type,
      title: title.trim(),
      body:  body.trim(),
    }));

    try {
      await notifyUsers(adminClient, rows);
    } catch (error) {
      console.error('[/api/admin/alert]', error);
      return NextResponse.json({ error: 'Failed to send alert notifications. Please try again.' }, { status: 500 });
    }
    totalSent += chunk.length;
  }

  return NextResponse.json({ sent: totalSent });
}
