import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, full_name').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const body = await req.json();
  const { crop_type, symptoms, urgency, severity, district, image_urls } = body;

  if (!crop_type || !symptoms || !district) {
    return NextResponse.json({ error: 'crop_type, symptoms, and district are required' }, { status: 400 });
  }

  const { data, error } = await (supabase.from as any)('disease_reports').insert({
    farmer_id:   (profile as any).id,
    farmer_name: (profile as any).full_name ?? null,
    crop_type,
    symptoms,
    urgency:     urgency ?? severity ?? 'medium',
    district,
    image_urls:  image_urls ?? null,
    status:      'reported',
    reported_at: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get('status');
  const urgency = searchParams.get('urgency') ?? searchParams.get('severity');
  const mine    = searchParams.get('mine');

  let q = (supabase.from as any)('disease_reports')
    .select('id, crop_type, symptoms, urgency, district, status, reported_at, created_at, farmer_id, farmer_name, pathologist_id, diagnosis, treatment, image_urls')
    .order('created_at', { ascending: true });

  if (status)  q = q.eq('status', status);
  if (urgency) q = q.eq('urgency', urgency);
  if (mine)    q = q.eq('pathologist_id', (await supabase.from('profiles').select('id').eq('user_id', user.id).single()).data?.id);

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
