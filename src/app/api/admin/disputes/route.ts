import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ACTION_MAP: Record<string, { status: string; extraFields?: Record<string, unknown> }> = {
  review:  { status: 'under_review' },
  resolve: { status: 'resolved', extraFields: { resolved_at: new Date().toISOString() } },
  close:   { status: 'closed' },
};

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  const transition = ACTION_MAP[action];
  if (!transition) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  const { error } = await (supabase.from as any)('disputes').update({
    status: transition.status,
    updated_at: new Date().toISOString(),
    ...(transition.extraFields ?? {}),
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: transition.status });
}
