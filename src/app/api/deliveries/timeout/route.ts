/**
 * POST /api/deliveries/timeout
 *
 * Called by Vercel Cron (every 60 seconds via vercel.json) or any internal
 * scheduler. Scans all delivery_requests in 'assigned' status that haven't
 * been paid yet, and:
 *   1. Sends reminder push at REMIND_1_SECS (2 min)
 *   2. Sends reminder push at REMIND_2_SECS (5 min)
 *   3. Auto-cancels at CANCEL_SECS (7 min, or 12 min if in_transit)
 *
 * Idempotent — safe to call multiple times per minute. Uses a
 * timeout_reminder_sent column to avoid duplicate notifications.
 *
 * Auth: Vercel cron sends CRON_SECRET in Authorization header.
 * Local dev: set CRON_SECRET=any-value in .env.local.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { notifyUser } from '@/lib/notify';
import {
  DELIVERY_TIMEOUT,
  getTimeoutPhase,
  secondsUntilCancel,
} from '@/lib/delivery-timeout';

const CRON_SECRET = process.env.CRON_SECRET ?? '';

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // Allow Vercel cron or internal server calls only
  const auth = req.headers.get('authorization') ?? '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = db();
  const now = new Date().toISOString();

  // Fetch all assigned deliveries that are still awaiting payment.
  // We extend the window slightly (CANCEL + IN_TRANSIT_GRACE + BUFFER + 60s)
  // to catch any deliveries that were missed in the previous cron tick.
  const maxAge = (
    DELIVERY_TIMEOUT.CANCEL_SECS
    + DELIVERY_TIMEOUT.IN_TRANSIT_GRACE_EXTRA
    + DELIVERY_TIMEOUT.PAYMENT_CONFIRM_BUFFER_SECS
    + 120
  );
  const oldestRelevant = new Date(Date.now() - maxAge * 1000).toISOString();

  const { data: deliveries, error: fetchErr } = await (admin.from as any)('delivery_requests')
    .select('id, status, requester_id, requester_role, transporter_id, accepted_at, payment_status, timeout_reminder_sent, cargo_type, cargo_kg, estimated_fare')
    .in('status', ['assigned', 'in_transit'])
    .neq('payment_status', 'paid')
    .gte('accepted_at', oldestRelevant)
    .order('accepted_at', { ascending: true });

  if (fetchErr) {
    console.error('[delivery-timeout] fetch error', fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const rows = deliveries ?? [];
  const results = { reminded1: 0, reminded2: 0, cancelled: 0, skipped: 0 };

  for (const dr of rows) {
    const isInTransit = dr.status === 'in_transit';
    const phase = getTimeoutPhase(dr.accepted_at, dr.payment_status === 'paid', isInTransit);
    const reminderSent = dr.timeout_reminder_sent as string | null;

    // ── Log the state transition for analytics ──────────────────────────────
    await (admin.from as any)('delivery_state_log').insert({
      delivery_id: dr.id,
      from_status: dr.status,
      to_status: phase,
      actor: 'system_timeout',
      created_at: now,
    }).then(() => {}).catch(() => {}); // non-critical, best effort

    if (phase === 'paid') {
      results.skipped++;
      continue;
    }

    // ── Auto-cancel ─────────────────────────────────────────────────────────
    if (phase === 'cancel_due') {
      // Check abuse history for this requester
      const windowStart = new Date(Date.now() - DELIVERY_TIMEOUT.ABUSE_WINDOW_SECS * 1000).toISOString();
      const { count: strikes } = await (admin.from as any)('delivery_requests')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', dr.requester_id)
        .eq('cancel_reason', 'non_payment_timeout')
        .gte('cancelled_at', windowStart);

      const strikeCount = strikes ?? 0;
      const isAbusive = strikeCount >= DELIVERY_TIMEOUT.ABUSE_MAX_STRIKES;

      // Cancel the delivery
      await (admin.from as any)('delivery_requests').update({
        status: 'cancelled',
        cancelled_at: now,
        cancel_reason: 'non_payment_timeout',
      }).eq('id', dr.id);

      // Release the driver's vehicle back to available
      if (dr.transporter_id) {
        await (admin.from as any)('vehicles')
          .update({ is_available: true, updated_at: now })
          .eq('user_id', dr.transporter_id);
      }

      // If requester is abusive, flag their account
      if (isAbusive) {
        await (admin.from as any)('profiles')
          .update({
            payment_abuse_flagged: true,
            payment_abuse_flagged_at: now,
          })
          .eq('user_id', dr.requester_id);
      }

      // Notify requester
      await notifyUser(admin, {
        userId: dr.requester_id,
        role: dr.requester_role ?? null,
        type: 'delivery',
        title: 'Delivery request cancelled',
        body: `Your delivery request was cancelled due to non-payment. The driver has been released.${isAbusive ? ' Your account has been flagged for repeated non-payment. Future timeouts may be shorter.' : ''}`,
        url: dr.requester_role === 'farmer' ? '/farmer/deliveries' : '/buyer/deliveries',
      }).catch(() => {});

      // Notify driver
      if (dr.transporter_id) {
        await notifyUser(admin, {
          userId: dr.transporter_id,
          role: 'transporter',
          type: 'delivery',
          title: 'Request cancelled — you are free',
          body: `The payment for your delivery job was not completed. The request has been cancelled and you are now available for new deliveries.`,
          url: '/transporter/deliveries',
        }).catch(() => {});
      }

      results.cancelled++;
      continue;
    }

    // ── Second reminder ──────────────────────────────────────────────────────
    if (phase === 'remind_2' && reminderSent !== 'remind_2') {
      const secsLeft = secondsUntilCancel(dr.accepted_at, isInTransit);
      const minsLeft = Math.max(1, Math.ceil(secsLeft / 60));

      await notifyUser(admin, {
        userId: dr.requester_id,
        role: dr.requester_role ?? null,
        type: 'delivery',
        title: '⚠️ Payment required',
        body: `Your delivery will be cancelled in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''} if payment is not completed. Pay now to keep your driver.`,
        url: dr.requester_role === 'farmer' ? '/farmer/deliveries' : '/buyer/deliveries',
      }).catch(() => {});

      await (admin.from as any)('delivery_requests')
        .update({ timeout_reminder_sent: 'remind_2', updated_at: now })
        .eq('id', dr.id);

      results.reminded2++;
      continue;
    }

    // ── First reminder ───────────────────────────────────────────────────────
    if (phase === 'remind_1' && !reminderSent) {
      await notifyUser(admin, {
        userId: dr.requester_id,
        role: dr.requester_role ?? null,
        type: 'delivery',
        title: '🚛 Your driver is waiting',
        body: `Complete payment for your ${dr.cargo_kg} kg delivery to confirm your driver. They cannot start until payment is received.`,
        url: dr.requester_role === 'farmer' ? '/farmer/deliveries' : '/buyer/deliveries',
      }).catch(() => {});

      await (admin.from as any)('delivery_requests')
        .update({ timeout_reminder_sent: 'remind_1', updated_at: now })
        .eq('id', dr.id);

      results.reminded1++;
      continue;
    }

    results.skipped++;
  }

  console.info('[delivery-timeout] processed', rows.length, 'deliveries', results);
  return NextResponse.json({ ok: true, processed: rows.length, ...results });
}

// Also expose as GET for easy manual triggering from the admin dashboard
export async function GET(req: NextRequest) {
  return POST(req);
}
