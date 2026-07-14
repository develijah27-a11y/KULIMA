import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: admin } = await (supabase.from as any)('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if ((admin as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { verificationId, userId, targetLevel, action, reason } = await req.json();
  if (!verificationId || !userId || !targetLevel || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const VALID_LEVELS = ['green', 'blue', 'gold'];
  const VALID_ACTIONS = ['approve', 'reject'];
  if (!VALID_LEVELS.includes(targetLevel)) {
    return NextResponse.json({ error: 'Invalid targetLevel' }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Update verification record
  const { error: vErr } = await (supabase.from as any)('verifications')
    .update({
      status:           action === 'approve' ? 'approved' : 'rejected',
      rejection_reason: action === 'reject'  ? (reason ?? 'Documents not accepted') : null,
      reviewed_at:      new Date().toISOString(),
      reviewed_by:      user.id,
    })
    .eq('id', verificationId);

  if (vErr) {
    console.error('[/api/admin/verify-kyc]', vErr);
    return NextResponse.json({ error: 'Failed to update the verification record.' }, { status: 500 });
  }

  // On approve: upgrade the profile's verification level
  if (action === 'approve') {
    const { error: pErr } = await (supabase.from as any)('profiles')
      .update({ verification_level: targetLevel })
      .eq('user_id', userId);
    if (pErr) {
      console.error('[/api/admin/verify-kyc]', pErr);
      return NextResponse.json({ error: 'Failed to update the profile verification level.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
