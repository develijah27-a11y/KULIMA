import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 500 });

  const { groupId } = await req.json();
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

  // Prevent leader from leaving (they must transfer leadership first)
  const { data: membership } = await (supabase.from as any)('farmer_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('farmer_id', (profile as any).id)
    .single();

  if ((membership as any)?.role === 'leader') {
    return NextResponse.json({ error: 'Group leaders cannot leave. Transfer leadership first.' }, { status: 400 });
  }

  const { error } = await (supabase.from as any)('farmer_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('farmer_id', (profile as any).id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
