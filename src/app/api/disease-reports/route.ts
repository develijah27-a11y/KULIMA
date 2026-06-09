import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status');
  const severity = searchParams.get('severity');
  const mine     = searchParams.get('mine');

  let q = (supabase.from as any)('disease_reports')
    .select('id, crop_type, symptoms, severity, district, status, reported_at, created_at, farmer_id, pathologist_id, diagnosis, treatment, image_urls')
    .order('created_at', { ascending: true });

  if (status)   q = q.eq('status', status);
  if (severity) q = q.eq('severity', severity);
  if (mine)     q = q.eq('pathologist_id', (await supabase.from('profiles').select('id').eq('user_id', user.id).single()).data?.id);

  const { data, error } = await q.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { id, action, diagnosis, treatment } = body;
  if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });

  let update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === 'claim') {
    update = { ...update, pathologist_id: (profile as any).id, status: 'assigned' };
  } else if (action === 'diagnose') {
    if (!diagnosis) return NextResponse.json({ error: 'Diagnosis required' }, { status: 400 });
    update = { ...update, diagnosis, treatment: treatment ?? null, status: 'diagnosed', diagnosed_at: new Date().toISOString() };
  } else if (action === 'close') {
    update = { ...update, status: 'closed' };
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { error } = await (supabase.from as any)('disease_reports')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
