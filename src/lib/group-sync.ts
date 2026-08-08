import type { SupabaseClient } from '@supabase/supabase-js';

// Links a profile into any group(s) where a group admin pre-registered this
// phone number (group_members, farmer_id still null) before the person had
// — or had verified — an app account. Called from two places:
//   1. create-profile/route.ts, right after signup, using whatever phone
//      number was entered then (unverified at that point).
//   2. verify/phone/confirm/route.ts, right after a phone number is
//      confirmed to actually belong to this user — catches the case where
//      the signup-time number didn't match (typo, changed number, or the
//      group admin registered them after signup) but the verified one does.
// Safe to call multiple times for the same profile — group_members rows
// already linked (farmer_id set) are excluded by the `.is('farmer_id',
// null)` filter, so a re-run is a no-op for anything already synced.
export async function syncGroupMembershipByPhone(
  supabase: SupabaseClient<any>,
  userId: string,
  profileId: string,
  phoneNumber: string,
) {
  const normalized = String(phoneNumber).replace(/\s+/g, '').replace(/^\+256/, '0').replace(/^256/, '0');

  const { data: rosterEntries } = await (supabase.from as any)('group_members')
    .select('id, admin_id, district')
    .or(`phone_number.eq.${normalized},phone_number.eq.+256${normalized.slice(1)}`)
    .is('farmer_id', null);

  if (!rosterEntries || rosterEntries.length === 0) return;

  for (const entry of rosterEntries) {
    const { data: adminProfile } = await (supabase.from as any)('profiles')
      .select('id').eq('user_id', entry.admin_id).maybeSingle();
    if (!adminProfile) continue;

    const { data: group } = await (supabase.from as any)('farmer_groups')
      .select('id, name').eq('leader_id', adminProfile.id).maybeSingle();
    if (!group) continue;

    const { error: linkErr } = await (supabase.from as any)('farmer_group_members')
      .insert({ group_id: group.id, farmer_id: profileId, role: 'member' });

    if (!linkErr) {
      await (supabase.from as any)('group_members')
        .update({ farmer_id: profileId })
        .eq('id', entry.id);

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
