import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';
import { adminManageAccountStatus } from '@/lib/moderation/quality-strikes';
import { withApiLogging, logSystemEvent } from '@/lib/system-log';

async function handlePATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { userId, action, reason, verificationLevel } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Load target profile
  const { data: targetProfile, error: profileErr } = await (admin.from as any)('profiles')
    .select('id, user_id, full_name, role, is_suspended, quality_strikes, phone_number')
    .eq('user_id', userId)
    .single();

  if (profileErr || !targetProfile) {
    return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
  }

  const userRole = targetProfile.role ?? 'farmer';

  // 1. REINSTATE ACCOUNT
  if (action === 'reinstate') {
    const result = await adminManageAccountStatus({
      sellerUserId: userId,
      action: 'reinstate',
      adminNotes: reason || 'Account reviewed and restored by administrator.',
    });

    logSystemEvent({
      category: 'api_request',
      level: 'info',
      route: '/api/admin/users',
      userId: user.id,
      message: `Admin reinstated user ${targetProfile.full_name ?? userId}`,
      metadata: { targetUserId: userId, action },
    });

    return NextResponse.json({ success: true, message: 'Account reinstated successfully', result });
  }

  // 2. SUSPEND ACCOUNT
  if (action === 'suspend') {
    const suspensionReason = reason?.trim() || 'Suspended by platform administrator for policy or quality review.';

    await (admin.from as any)('profiles').update({
      is_suspended: true,
      suspension_reason: suspensionReason,
      suspended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    // If seller, deactivate their active listings
    await (admin.from as any)('listings')
      .update({ status: 'inactive' })
      .eq('farmer_id', targetProfile.id)
      .eq('status', 'active');

    // Notify user with strict role isolation
    await notifyUser(admin as any, {
      userId,
      role: userRole as any,
      type: 'alert',
      title: '🚨 Account Temporarily Suspended',
      body: `Your account has been temporarily suspended by moderation: ${suspensionReason}. Contact support to resolve.`,
      url: `/${userRole}/support`,
    });

    logSystemEvent({
      category: 'api_request',
      level: 'warn',
      route: '/api/admin/users',
      userId: user.id,
      message: `Admin suspended user ${targetProfile.full_name ?? userId}. Reason: ${suspensionReason}`,
      metadata: { targetUserId: userId, action, reason: suspensionReason },
    });

    return NextResponse.json({ success: true, message: 'Account suspended successfully' });
  }

  // 3. RESET QUALITY STRIKES
  if (action === 'reset_strikes') {
    const result = await adminManageAccountStatus({
      sellerUserId: userId,
      action: 'reset_strikes',
      adminNotes: reason || 'Quality strikes reset to 0 by administrator.',
    });

    logSystemEvent({
      category: 'api_request',
      level: 'info',
      route: '/api/admin/users',
      userId: user.id,
      message: `Admin reset quality strikes for user ${targetProfile.full_name ?? userId}`,
      metadata: { targetUserId: userId, action },
    });

    return NextResponse.json({ success: true, message: 'Quality strikes reset to 0', result });
  }

  // 4. UPDATE VERIFICATION LEVEL
  if (action === 'update_verification') {
    if (!['grey', 'green', 'blue', 'gold'].includes(verificationLevel)) {
      return NextResponse.json({ error: 'Invalid verification level. Must be grey, green, blue, or gold.' }, { status: 400 });
    }

    await (admin.from as any)('profiles').update({
      verification_level: verificationLevel,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    const LEVEL_NAMES: Record<string, string> = {
      grey: 'Unverified',
      green: 'Basic Verified',
      blue: 'Standard Verified',
      gold: 'Premium Verified',
    };

    await notifyUser(admin as any, {
      userId,
      role: userRole as any,
      type: 'system',
      title: `Verification Status: ${LEVEL_NAMES[verificationLevel]}`,
      body: `Your account verification status has been updated to ${LEVEL_NAMES[verificationLevel]}.`,
      url: `/${userRole}/dashboard`,
    });

    logSystemEvent({
      category: 'api_request',
      level: 'info',
      route: '/api/admin/users',
      userId: user.id,
      message: `Admin updated verification level of ${targetProfile.full_name ?? userId} to ${verificationLevel}`,
      metadata: { targetUserId: userId, action, verificationLevel },
    });

    return NextResponse.json({ success: true, message: `Verification level updated to ${LEVEL_NAMES[verificationLevel]}` });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

export const PATCH = withApiLogging('/api/admin/users', handlePATCH);
