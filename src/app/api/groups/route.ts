import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { name, description, district } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Group name required' }, { status: 400 });

  const { data: group, error: gErr } = await (supabase.from as any)('farmer_groups').insert({
    name:        name.trim(),
    description: description?.trim() || null,
    district:    district || null,
    leader_id:   (profile as any).id,
    is_active:   true,
  }).select().single();

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  // Auto-add creator as leader member
  await (supabase.from as any)('group_members').insert({
    group_id:  group.id,
    farmer_id: (profile as any).id,
    role:      'leader',
  });

  return NextResponse.json({ data: group }, { status: 201 });
}
