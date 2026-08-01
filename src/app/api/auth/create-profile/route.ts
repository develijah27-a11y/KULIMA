import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logSystemEvent, withApiLogging } from '@/lib/system-log';

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
      const normalized = String(phoneNumber).replace(/\s+/g, '').replace(/^\+256/, '0').replace(/^256/, '0');

      // Find this user's new profile id
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (newProfile) {
        // Find all unlinked roster entries with a matching phone number
        const { data: rosterEntries } = await (supabase.from as any)('group_members')
          .select('id, admin_id, district')
          .or(`phone_number.eq.${normalized},phone_number.eq.+256${normalized.slice(1)}`)
          .is('farmer_id', null);

        if (rosterEntries && rosterEntries.length > 0) {
          for (const entry of rosterEntries) {
            // Find the farmer_groups row for this admin
            const { data: adminProfile } = await (supabase.from as any)('profiles')
              .select('id').eq('user_id', entry.admin_id).maybeSingle();
            if (!adminProfile) continue;

            const { data: group } = await (supabase.from as any)('farmer_groups')
              .select('id, name').eq('leader_id', adminProfile.id).maybeSingle();
            if (!group) continue;

            // Link in farmer_group_members
            const { error: linkErr } = await (supabase.from as any)('farmer_group_members')
              .insert({ group_id: group.id, farmer_id: newProfile.id, role: 'member' });

            if (!linkErr) {
              // Update the roster entry to point to the real account
              await (supabase.from as any)('group_members')
                .update({ farmer_id: newProfile.id })
                .eq('id', entry.id);

              // Notify the new user that they've been added to a group
              const { notifyUser } = await import('@/lib/notify');
              await notifyUser(supabase, {
                userId,
                role: 'farmer',
                type: 'group',
                title: 'You have been added to a group',
                body: `You were pre-registered in "${group.name}" — you have been automatically joined. Visit your groups dashboard to see your group.`,
                url: '/farmer/groups',
              }).catch(() => {});
            }
          }
        }
      }
    } catch (syncErr) {
      // Non-critical — profile was created successfully; sync failure is logged but not surfaced
      console.error('[/api/auth/create-profile] group sync error:', syncErr);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ ok: true });
}

export const POST = withApiLogging('/api/auth/create-profile', handlePOST);
