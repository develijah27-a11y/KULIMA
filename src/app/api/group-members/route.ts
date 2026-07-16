import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
//  - If the phone number matches a real registered AgriNova account, they're
//    linked as a genuine group member (farmer_group_members) — enforcing one
//    group per farmer and same-district — and get notified.
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

    const { data: matchedProfile } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, location')
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+256${normalizedPhone.slice(1)}`)
      .limit(1)
      .maybeSingle();

    if (matchedProfile) {
      // Same-district check — the whole point of a group is collecting
      // produce for one shipment, which only works if everyone is local.
      if ((matchedProfile as any).location && (matchedProfile as any).location !== district) {
        return NextResponse.json({
          error: `${matchedProfile.full_name} is registered in ${(matchedProfile as any).location}, not ${district}. Group members must be in the same district.`,
        }, { status: 400 });
      }

      // One-group-per-farmer check
      const { data: existingMembership } = await (supabase.from as any)('farmer_group_members')
        .select('group_id, farmer_groups(name)')
        .eq('farmer_id', matchedProfile.id)
        .maybeSingle();

      if (existingMembership) {
        const groupName = (existingMembership as any).farmer_groups?.name ?? 'another group';
        return NextResponse.json({
          error: `${matchedProfile.full_name} is already a member of ${groupName} and can only belong to one group at a time.`,
        }, { status: 409 });
      }

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

          await (supabase.from as any)('notifications').insert({
            user_id: (matchedProfile as any).user_id,
            role: 'farmer',
            type: 'group',
            title: 'You have been added to a group',
            body: `${adminName} added you to "${groupName}" on AgriNova. Open the app to see your group members and activities.`,
            read: false,
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
