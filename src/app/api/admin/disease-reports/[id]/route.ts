import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Unauthorized', status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') return { ok: false as const, error: 'Admin only', status: 403 };
  return { ok: true as const, supabase };
}

const VALID_STATUSES = ['reported', 'assigned', 'diagnosed', 'closed'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { status, pathologistId } = await req.json();

  const update: Record<string, unknown> = {};
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    update.status = status;
  }
  if (pathologistId !== undefined) update.pathologist_id = pathologistId || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await (auth.supabase.from as any)('disease_reports').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
