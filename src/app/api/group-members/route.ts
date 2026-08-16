import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('group_members')
    .select('*')
    .eq('admin_id', user.id)
    .order('role')
    .order('full_name')
    .limit(100);

  if (error) {
    console.error('[/api/group-members]', error);
    return NextResponse.json({ error: 'Failed to load group members. Please try again.' }, { status: 500 });
  }
  return NextResponse.json(
    { members: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
  );
}

// Adding a member here does double duty:
//  - If the phone number matches a real registered Cropify account, they're
//    linked as a genuine group member (farmer_group_members) — enforcing
//    same-district (a farmer may belong to more than one group, as long as
//    each is local to them) — and get notified.
//  - Otherwise this is saved as a roster-only record (name/district/crop for
//    the admin's own bookkeeping) with no account to link or notify yet.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { full_name, phone_number, district, role, crop_type } = body;

  if (!full_name || !district) {
    return NextResponse.json({ error: 'Name and district are required' }, { status: 400 });
  }

  let linkedFarmerId: string | null = null;
  let linked = false;

  if (phone_number) {
    const normalizedPhone = String(phone_number).replace(/\s+/g, '').replace(/^\+256/, '0').replace(/^256/, '0');

    // profiles' SELECT RLS only allows a caller to read their own row (or an
    // admin to read any row) — under the regular request-scoped client this
    // lookup silently returned nothing for every phone number except the
    // admin's own, since RLS filtered the other farmer's row out before the
    // phone_number match even ran. Every real add-member call was landing as
    // an unlinked roster-only record no matter how correct the phone number
    // was. This is a legitimate server-side lookup (the route already
    // authenticated the caller and only uses id/user_id/full_name/location
    // to link an existing account, not to expose data to the client), so it
    // needs the service-role client to actually see other users' rows.
    const admin = createServiceRoleClient();
    const { data: matchedProfile } = await admin
      .from('profiles')
      .select('id, user_id, full_name, location')
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+256${normalizedPhone.slice(1)}`)
      .limit(1)
      .maybeSingle();

    if (matchedProfile) {
      // Same-district check — the whole point of a group is collecting
      // produce for one shipment, which only works if everyone is local.
      // Compared case/whitespace-insensitively: real profile data has
      // inconsistent casing and stray trailing spaces (e.g. "Kampala " vs
      // "kampala"), which would otherwise reject a genuinely matching
      // district as if it were a different one.
      const matchedLocation = ((matchedProfile as any).location ?? '').trim();
      const inputDistrict = String(district).trim();
      if (matchedLocation && matchedLocation.toLowerCase() !== inputDistrict.toLowerCase()) {
        return NextResponse.json({
          error: `${matchedProfile.full_name} is registered in ${matchedLocation}, not ${inputDistrict}. Group members must be in the same district.`,
        }, { status: 400 });
      }

      // A farmer can belong to more than one group, as long as each is in
      // their own district (checked above) — no longer capped at one group.
      // Resolve this admin's own farmer_groups.id and name
      const { data: myProfile } = await supabase.from('profiles').select('id, full_name').eq('user_id', user.id).single();
      const { data: myGroup } = myProfile
        ? await (supabase.from as any)('farmer_groups').select('id, name').eq('leader_id', (myProfile as any).id).maybeSingle()
        : { data: null };

      if (myGroup) {
        const { error: linkError } = await (supabase.from as any)('farmer_group_members').insert({
          group_id: (myGroup as any).id,
          farmer_id: matchedProfile.id,
          role: role ?? 'member',
        });

        if (!linkError) {
          linked = true;
          linkedFarmerId = matchedProfile.id;

          const adminName = (myProfile as any)?.full_name ?? 'Your group leader';
          const groupName = (myGroup as any)?.name ?? 'a farmer group';

          await notifyUser(supabase, {
            userId: (matchedProfile as any).user_id,
            role: 'farmer',
            type: 'group',
            title: 'You have been added to a group',
            body: `${adminName} added you to "${groupName}" on Cropify. Open the app to see your group members and activities.`,
            url: '/farmer/groups',
          });
        }
      }
    }
  }

  const { data, error } = await (supabase.from as any)('group_members').insert({
    admin_id:     user.id,
    farmer_id:    linkedFarmerId,
    full_name:    full_name.trim(),
    phone_number: phone_number ?? null,
    district,
    role:         role ?? 'member',
    crop_type:    crop_type ?? null,
    joined_at:    new Date().toISOString(),
  }).select().single();

  if (error) {
    console.error('[/api/group-members]', error);
    return NextResponse.json({ error: 'Failed to add group member. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ member: data, linked }, { status: 201 });
}
