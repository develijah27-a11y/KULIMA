import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DISTRICT_NAMES } from '@/lib/districts';
import { z } from 'zod';

const UpdateSchema = z.object({
  districts: z.array(z.enum(DISTRICT_NAMES as [string, ...string[]])).max(DISTRICT_NAMES.length),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, roles').eq('user_id', user.id).single();
  const isSupplier = (profile as any)?.role === 'supplier' || ((profile as any)?.roles ?? []).includes('supplier');
  if (!isSupplier) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });

  const { error } = await (supabase.from as any)('profiles')
    .update({ coverage_districts: parsed.data.districts })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, districts: parsed.data.districts });
}
