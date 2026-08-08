import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logSystemEvent, withApiLogging } from '@/lib/system-log';
import { syncGroupMembershipByPhone } from '@/lib/group-sync';

async function handlePOST(req: Request) {
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
    logSystemEvent({
      category: 'auth_failure',
      level: 'warn',
      route: '/api/auth/create-profile',
      method: 'POST',
      userId: user?.id ?? null,
      message: user ? `Session user did not match requested profile userId` : 'Unauthenticated create-profile attempt',
      metadata: { requestedUserId: userId },
    });
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

  // ── Auto-sync group membership ─────────────────────────────────────────────
  // If any group admin pre-registered this phone number in their roster
  // (group_members) before this user joined the app, link them now.
  // We do this after the profile is created so we can reference profiles.id.
  if (phoneNumber) {
    try {
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      // Note: this matches on whatever number was typed at signup, which is
      // NOT yet verified at this point — syncGroupMembershipByPhone runs
      // again after phone verification (see verify/phone/confirm/route.ts)
      // to catch the case where this initial match misses (typo, changed
      // number, or the group admin registered them after signup).
      if (newProfile) await syncGroupMembershipByPhone(supabase, userId, newProfile.id, phoneNumber);
    } catch (syncErr) {
      // Non-critical — profile was created successfully; sync failure is logged but not surfaced
      console.error('[/api/auth/create-profile] group sync error:', syncErr);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ ok: true });
}

export const POST = withApiLogging('/api/auth/create-profile', handlePOST);
