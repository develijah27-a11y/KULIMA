import { createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser, notifyUsers } from '@/lib/notify';

export interface QualityStrikeResult {
  ok: boolean;
  strikeCount: number;
  isSuspended: boolean;
  message: string;
  error?: string;
}

/**
 * Records a poor-quality or under-grade produce report against a seller/farmer.
 * Automatically tracks strike count. If strikes reach 3 or more, the account
 * is automatically flagged and temporarily suspended.
 */
export async function recordQualityStrike(params: {
  sellerUserId: string;
  reporterUserId: string;
  orderId?: string;
  reason?: string;
  description?: string;
}): Promise<QualityStrikeResult> {
  const { sellerUserId, reporterUserId, orderId, reason = 'poor_quality', description } = params;
  if (!sellerUserId) {
    return { ok: false, strikeCount: 0, isSuspended: false, message: 'sellerUserId is required' };
  }

  const admin = createServiceRoleClient();

  // 1. Fetch current profile
  const { data: profile, error: profileErr } = await (admin.from as any)('profiles')
    .select('id, user_id, full_name, role, is_suspended, quality_strikes, suspension_reason')
    .eq('user_id', sellerUserId)
    .single();

  if (profileErr || !profile) {
    console.error('[quality-strikes] Failed to fetch seller profile:', profileErr);
    return { ok: false, strikeCount: 0, isSuspended: false, message: 'Seller profile not found' };
  }

  // 2. Query all existing poor-quality fraud flags / disputes for this seller to ensure an accurate count
  const { count: existingFlagCount } = await (admin.from as any)('fraud_flags')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', sellerUserId)
    .in('status', ['open', 'investigating']);

  const currentStrikes = Math.max((profile.quality_strikes ?? 0), (existingFlagCount ?? 0));
  const newStrikeCount = currentStrikes + 1;
  const shouldSuspend = newStrikeCount >= 3;

  const strikeSeverity = shouldSuspend ? 'critical' : newStrikeCount === 2 ? 'high' : 'medium';
  const flagDescription = description || `Reported by buyer for poor quality / under-grade produce (Strike #${newStrikeCount}). Reason: ${reason}`;

  // 3. Insert fraud flag record for admin oversight
  // Try inserting with 'poor_quality_produce', fallback to 'other' if migration hasn't run yet
  const insertFlagPayload = {
    user_id: sellerUserId,
    flagged_by: reporterUserId,
    reason: 'poor_quality_produce',
    severity: strikeSeverity,
    description: flagDescription,
    status: 'open',
  };

  let flagInsertErr = (await (admin.from as any)('fraud_flags').insert(insertFlagPayload)).error;
  if (flagInsertErr && flagInsertErr.message?.includes('reason')) {
    // Fallback to 'other' with reason in description
    insertFlagPayload.reason = 'other';
    insertFlagPayload.description = `[POOR QUALITY PRODUCE STRIKE #${newStrikeCount}] ${flagDescription}`;
    flagInsertErr = (await (admin.from as any)('fraud_flags').insert(insertFlagPayload)).error;
  }

  if (flagInsertErr) {
    console.warn('[quality-strikes] Could not insert fraud flag (non-fatal):', flagInsertErr);
  }

  // 4. Update profile strikes and suspension status
  const profileUpdates: Record<string, unknown> = {
    quality_strikes: newStrikeCount,
    updated_at: new Date().toISOString(),
  };

  if (shouldSuspend) {
    profileUpdates.is_suspended = true;
    profileUpdates.suspension_reason = `Exceeded 3 consistent poor-quality / under-grade produce reports (${newStrikeCount} strikes recorded).`;
    profileUpdates.suspended_at = new Date().toISOString();
  }

  // Safe update: handle if is_suspended column is still migrating
  const { error: updateErr } = await (admin.from as any)('profiles')
    .update(profileUpdates)
    .eq('user_id', sellerUserId);

  if (updateErr && updateErr.message?.includes('column')) {
    // Fallback if is_suspended column doesn't exist yet in the DB
    await (admin.from as any)('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', sellerUserId);
  }

  // 5. Send User Notifications
  if (shouldSuspend) {
    // Alert the seller: Temporary Suspension
    await notifyUser(admin as any, {
      userId: sellerUserId,
      role: (profile.role ?? 'farmer') as any,
      type: 'alert',
      title: '🚨 Account Temporarily Suspended — 3 Quality Strikes',
      body: `Your seller account has received 3 verified complaints for poor-grade or substandard produce. In accordance with Cropify quality standards, your account has been temporarily suspended. New listings and orders are blocked pending admin review.`,
      data: { strikes: newStrikeCount, order_id: orderId },
      url: `/${profile.role ?? 'farmer'}/support`,
    });

    // Alert all admins
    const { data: admins } = await (admin.from as any)('profiles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      await notifyUsers(
        admin as any,
        admins.map((a: any) => ({
          userId: a.user_id,
          type: 'alert',
          title: `🚨 Seller Auto-Suspended (3 Strikes): ${profile.full_name ?? 'Farmer'}`,
          body: `Farmer ${profile.full_name ?? sellerUserId.slice(0, 8)} reached ${newStrikeCount} quality complaints. Account is temporarily suspended.`,
          data: { seller_user_id: sellerUserId, strikes: newStrikeCount },
          url: '/admin/fraud',
        }))
      );
    }
  } else {
    // Warning strike notification (Strikes 1 and 2)
    await notifyUser(admin as any, {
      userId: sellerUserId,
      role: (profile.role ?? 'farmer') as any,
      type: 'warning',
      title: `⚠️ Quality Warning: Strike #${newStrikeCount} of 3`,
      body: `A buyer reported substandard or under-grade produce on your order. Cropify requires accurate grading. Reaching 3 quality strikes will result in automatic temporary suspension of your account.`,
      data: { strikes: newStrikeCount, order_id: orderId },
      url: `/${profile.role ?? 'farmer'}/support`,
    });
  }

  return {
    ok: true,
    strikeCount: newStrikeCount,
    isSuspended: shouldSuspend,
    message: shouldSuspend
      ? `Farmer exceeded 3 consistent poor-quality reports and has been temporarily suspended.`
      : `Quality strike #${newStrikeCount} recorded for seller. Warning sent.`,
  };
}

/**
 * Checks if an account is currently suspended due to quality strikes or admin moderation.
 */
export async function checkIsAccountSuspended(userId: string): Promise<{
  isSuspended: boolean;
  reason: string | null;
  strikes: number;
}> {
  if (!userId) return { isSuspended: false, reason: null, strikes: 0 };
  const admin = createServiceRoleClient();

  const { data: profile } = await (admin.from as any)('profiles')
    .select('is_suspended, suspension_reason, quality_strikes')
    .eq('user_id', userId)
    .single();

  if (profile?.is_suspended) {
    return {
      isSuspended: true,
      reason: profile.suspension_reason ?? 'Account temporarily suspended due to quality violations.',
      strikes: profile.quality_strikes ?? 3,
    };
  }

  // Also check if user has critical open quality fraud flags
  const { count: criticalFlags } = await (admin.from as any)('fraud_flags')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('severity', 'critical')
    .eq('status', 'open');

  if ((criticalFlags ?? 0) >= 1 && (profile?.quality_strikes ?? 0) >= 3) {
    return {
      isSuspended: true,
      reason: profile?.suspension_reason ?? 'Account flagged for 3 or more poor-quality produce complaints.',
      strikes: profile?.quality_strikes ?? 3,
    };
  }

  return {
    isSuspended: false,
    reason: null,
    strikes: profile?.quality_strikes ?? 0,
  };
}

/**
 * Admin action to lift suspension, reset strikes, or permanently terminate an account.
 */
export async function adminManageAccountStatus(params: {
  sellerUserId: string;
  action: 'reinstate' | 'terminate' | 'reset_strikes';
  adminNotes?: string;
}) {
  const { sellerUserId, action, adminNotes } = params;
  const admin = createServiceRoleClient();

  if (action === 'reinstate') {
    await (admin.from as any)('profiles').update({
      is_suspended: false,
      suspension_reason: null,
      suspended_at: null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', sellerUserId);

    // Mark open quality flags as resolved
    await (admin.from as any)('fraud_flags')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('user_id', sellerUserId)
      .eq('status', 'open');

    await notifyUser(admin as any, {
      userId: sellerUserId,
      role: 'farmer',
      type: 'alert',
      title: '✅ Account Suspension Lifted',
      body: adminNotes || 'Your account suspension has been reviewed and lifted. Please ensure all produce meets advertised grades.',
      url: '/farmer/dashboard',
    });

    return { ok: true, status: 'active', message: 'Account reinstated successfully' };
  }

  if (action === 'reset_strikes') {
    await (admin.from as any)('profiles').update({
      quality_strikes: 0,
      is_suspended: false,
      suspension_reason: null,
      suspended_at: null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', sellerUserId);

    await (admin.from as any)('fraud_flags')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('user_id', sellerUserId);

    return { ok: true, status: 'active', message: 'Quality strikes reset to 0' };
  }

  if (action === 'terminate') {
    await (admin.from as any)('profiles').update({
      is_suspended: true,
      suspension_reason: adminNotes || 'Account permanently terminated for consistent poor-grade produce violations.',
      updated_at: new Date().toISOString(),
    }).eq('user_id', sellerUserId);

    // Deactivate active listings
    const { data: profile } = await (admin.from as any)('profiles').select('id').eq('user_id', sellerUserId).single();
    if (profile?.id) {
      await (admin.from as any)('listings')
        .update({ status: 'inactive' })
        .eq('farmer_id', profile.id)
        .eq('status', 'active');
    }

    await notifyUser(admin as any, {
      userId: sellerUserId,
      role: 'farmer',
      type: 'alert',
      title: '⛔ Account Terminated',
      body: adminNotes || 'Your account has been permanently terminated due to repeated substandard produce deliveries.',
      url: '/farmer/support',
    });

    return { ok: true, status: 'terminated', message: 'Account permanently terminated' };
  }

  return { ok: false, message: 'Invalid action' };
}
