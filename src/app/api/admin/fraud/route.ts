import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ACTION_MAP: Record<string, string> = {
  investigate: 'investigating',
  resolve:     'resolved',
  dismiss:     'dismissed',
};

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  const nextStatus = ACTION_MAP[action];
  if (!nextStatus) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  const { error } = await (supabase.from as any)('fraud_flags').update({
    status:     nextStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: nextStatus });
}
