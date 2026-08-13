import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

type Params = { params: Promise<{ id: string }> };

// Admin removes a member from their group roster.
// Also removes the farmer_group_members link if one exists.
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify the row belongs to the calling admin before deleting
  const { data: member, error: fetchErr } = await (admin.from as any)('group_members')
    .select('id, admin_id, farmer_id')
    .eq('id', id)
    .single();

  if (fetchErr || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }
  if (member.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If the member is linked to a real Cropify account, remove the
  // farmer_group_members row too so their farmer dashboard no longer shows
  // this group.
  if (member.farmer_id) {
    // Find the group owned by this admin
    const { data: myProfile } = await (admin.from as any)('profiles')
      .select('id').eq('user_id', user.id).single();
    if (myProfile) {
      const { data: myGroup } = await (admin.from as any)('farmer_groups')
        .select('id').eq('leader_id', myProfile.id).maybeSingle();
      if (myGroup) {
        await (admin.from as any)('farmer_group_members')
          .delete()
          .eq('group_id', myGroup.id)
          .eq('farmer_id', member.farmer_id);
      }
    }
  }

  const { error: deleteErr } = await (admin.from as any)('group_members')
    .delete()
    .eq('id', id);

  if (deleteErr) {
    console.error('[DELETE /api/group-members/:id]', deleteErr);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
