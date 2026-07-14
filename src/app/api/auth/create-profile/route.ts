import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { userId, fullName, phoneNumber, location } = await req.json().catch(() => ({}));

  if (!userId || !fullName) {
    return NextResponse.json({ ok: false, error: 'userId and fullName required' }, { status: 400 });
  }

  // This endpoint uses the service-role client (bypasses RLS) specifically to
  // create a brand-new user's own profile row right after signUp() — but that
  // means it MUST verify the caller is actually authenticated as that exact
  // userId first, or anyone could pass an arbitrary userId here and overwrite
  // another user's profile (including resetting their role to 'pending').
  const authed = await createClient();
  const { data: { user } } = await authed.auth.getUser();
  if (!user || user.id !== userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id:      userId,
      full_name:    fullName,
      phone_number: phoneNumber ?? null,
      location:     location ?? null,
      role:         'pending',
      roles:        ['pending'],
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[/api/auth/create-profile]', error);
    return NextResponse.json({ ok: false, error: 'Failed to create profile. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
