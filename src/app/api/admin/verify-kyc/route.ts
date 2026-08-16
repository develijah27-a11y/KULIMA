import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';
import { withApiLogging } from '@/lib/system-log';
import { NEXT_LEVEL, getLevelDetails, type VerificationLevel } from '@/lib/trust';

const LEVEL_LABEL: Record<string, string> = { green: 'Green', blue: 'Blue', gold: 'Gold' };

async function handlePOST(req: NextRequest) {
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

  // Fetch which role this submission was for — an account can hold several
  // roles (e.g. a farmer who also registered as a supplier), and approving
  // one role's documents must not silently upgrade a trust badge shown
  // under a different role that never submitted anything.
  const { data: verification } = await (supabase.from as any)('verifications')
    .select('role')
    .eq('id', verificationId)
    .single();

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

  // On approve: upgrade the profile's per-role verification level
  if (action === 'approve') {
    const { data: profile } = await (supabase.from as any)('profiles')
      .select('role, role_verification_levels')
      .eq('user_id', userId)
      .single();

    const submissionRole = (verification as any)?.role || (profile as any)?.role;
    const roleLevels = { ...((profile as any)?.role_verification_levels ?? {}), [submissionRole]: targetLevel };

    const update: Record<string, unknown> = { role_verification_levels: roleLevels };
    // The flat verification_level column is read by most of the app as
    // "this account's own verification" — only meaningful to keep in sync
    // when the approval is for the account's PRIMARY role, so a secondary
    // role's approval can't overwrite the badge the primary identity earned.
    if (!(profile as any)?.role || submissionRole === (profile as any).role) {
      update.verification_level = targetLevel;
    }

    // profiles' UPDATE RLS policy only allows a row's own user to update it
    // (auth.uid() = user_id) — there is no admin-override clause, so running
    // this through the admin's own request-scoped client silently touches
    // zero rows for any OTHER user's profile (no error, update just doesn't
    // happen) and the "approved" notification below would go out even
    // though the badge was never actually granted. Use the service-role
    // client, same as every other admin-writes-another-user's-profile path
    // in this codebase (see verify/phone/confirm, subscriptions).
    const svc = createServiceRoleClient();
    const { error: pErr } = await (svc.from as any)('profiles')
      .update(update)
      .eq('user_id', userId);
    if (pErr) {
      console.error('[/api/admin/verify-kyc]', pErr);
      return NextResponse.json({ error: 'Failed to update the profile verification level.' }, { status: 500 });
    }
  }

  const submissionRole = (verification as any)?.role;

  // On approval, tell the user what they can still upgrade to (unless
  // they're already at the max tier) — previously this notification just
  // confirmed the badge and stopped, so a green-tier user never learned
  // blue/gold existed or what it'd unlock for them (same benefits copy the
  // dashboard's VerificationBanner now surfaces on an ongoing basis).
  const nextLevel = action === 'approve' ? NEXT_LEVEL[targetLevel as VerificationLevel] : undefined;
  const nextLevelTeaser = nextLevel && submissionRole
    ? ` Want more? Upgrade to ${getLevelDetails(nextLevel, submissionRole).title} to unlock ${getLevelDetails(nextLevel, submissionRole).benefits[0]?.toLowerCase()}.`
    : '';

  await notifyUser(supabase, {
    userId: userId,
    role:   submissionRole ?? null,
    type:   'system',
    title:  action === 'approve'
              ? `Verification approved — ${LEVEL_LABEL[targetLevel] ?? targetLevel} badge`
              : 'Verification not approved',
    body:   action === 'approve'
              ? `Your documents were reviewed and approved. You now have the ${LEVEL_LABEL[targetLevel] ?? targetLevel} trust badge.${nextLevelTeaser}`
              : `Your verification documents were not approved. ${reason ?? 'Please review and resubmit.'}`,
    data:   { verification_id: verificationId, target_level: targetLevel },
    url:    submissionRole ? `/${submissionRole}/verify` : '/dashboard',
  });

  return NextResponse.json({ success: true });
}

export const POST = withApiLogging('/api/admin/verify-kyc', handlePOST);
