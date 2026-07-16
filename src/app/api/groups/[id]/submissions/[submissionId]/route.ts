import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string; submissionId: string }> };

// DELETE /api/groups/[id]/submissions/[submissionId] — member withdraws their
// own submission, as long as it hasn't been organized into a listing yet.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: groupId, submissionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { error } = await (supabase.from as any)('group_listing_submissions')
    .delete()
    .eq('id', submissionId)
    .eq('group_id', groupId)
    .eq('farmer_id', myProfile.id)
    .eq('status', 'pending');

  if (error) {
    console.error('[/api/groups/[id]/submissions/[submissionId] DELETE]', error);
    return NextResponse.json({ error: 'Failed to withdraw submission. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
