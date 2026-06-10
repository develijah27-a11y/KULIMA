import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { userId, fullName, phoneNumber, location } = await req.json().catch(() => ({}));

  if (!userId || !fullName) {
    return NextResponse.json({ ok: false, error: 'userId and fullName required' }, { status: 400 });
  }

  // Service role bypasses RLS — safe here because we're creating the user's own profile
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      full_name: fullName,
      phone_number: phoneNumber ?? null,
      location: location ?? null,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
