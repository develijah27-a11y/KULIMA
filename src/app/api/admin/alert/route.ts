import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

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

  // Fetch target profile IDs
  let profileQuery = (adminClient.from as any)('profiles').select('id, role, user_id');
  if (targetRole && targetRole !== 'all' && VALID_ROLES.includes(targetRole)) {
    profileQuery = profileQuery.eq('role', targetRole);
  }

  const { data: profiles, error: profileErr } = await profileQuery;
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

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
      farmer_id: p.id,       // notifications.farmer_id references profiles.id
      user_id:   p.user_id,  // GET /api/notifications and the realtime bell filter on user_id
      type,
      title: title.trim(),
      body:  body.trim(),
      read:  false,
    }));

    const { error } = await (adminClient.from as any)('notifications').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    totalSent += chunk.length;
  }

  return NextResponse.json({ sent: totalSent });
}
