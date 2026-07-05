import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 500 });

  const { groupId, phone_number } = await req.json();
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

  // A phone number is required so group sale payouts can reach this
  // member's mobile money — capture it now if the profile doesn't have one.
  if (!(profile as any).phone_number) {
    if (!phone_number?.trim()) {
      return NextResponse.json({ error: 'PHONE_REQUIRED' }, { status: 400 });
    }
    await supabase.from('profiles').update({ phone_number: phone_number.trim() }).eq('id', (profile as any).id);
  }

  const { error } = await (supabase.from as any)('farmer_group_members').insert({
    group_id:  groupId,
    farmer_id: (profile as any).id,
    role:      'member',
  });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
