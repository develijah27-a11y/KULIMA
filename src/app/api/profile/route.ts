import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { full_name, phone_number, location, primary_crop } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ ok: false, error: 'Full name is required' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update({
    full_name:    full_name.trim(),
    phone_number: phone_number?.trim() || null,
    location:     location?.trim()     || null,
    primary_crop: primary_crop?.trim() || null,
  }).eq('user_id', user.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
