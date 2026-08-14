/**
 * Delivery Payment Timeout Configuration
 * ───────────────────────────────────────
 * All timer values are in SECONDS. Change them here to tune behavior
 * post-launch without touching any business logic.
 *
 * State machine:
 *   open → assigned (pending_payment) → confirmed → in_transit → delivered
 *                                      ↘ cancelled (non-payment timeout)
 *
 * Timeline from the moment a driver is assigned (t=0):
 *   t=0           Payment prompt shown in UI (blocking sheet)
 *   t=REMIND_1    Push notification #1 — "Driver waiting, complete payment"
 *   t=REMIND_2    Push notification #2 — "Payment required in X min or cancelled"
 *   t=CANCEL      Auto-cancel, release driver, notify both parties
 *
 * Grace periods:
 *   If the driver has already started moving to pickup (status=in_transit),
 *   the CANCEL window is extended by IN_TRANSIT_GRACE_EXTRA seconds to
 *   avoid cancelling a driver who is already on the road.
 *
 * MoMo buffer:
 *   PAYMENT_CONFIRM_BUFFER_SECS is subtracted from the cancel threshold when
 *   checking whether a timer has genuinely expired. This ensures we never
 *   cancel a delivery where a valid MoMo push was sent but the confirmation
 *   webhook hasn't arrived yet (typical MTN/Airtel lag is 20–90 seconds).
 *
 * Abuse protection:
 *   ABUSE_WINDOW_SECS   — rolling window for counting non-payment cancellations
 *   ABUSE_MAX_STRIKES   — max cancellations before the account is flagged
 *   ABUSE_TIMEOUT_EXTRA — additional seconds added to CANCEL for flagged accounts
 *                         (shorter window, so they must pay faster)
 *   ABUSE_RESTRICT_NEW  — whether flagged accounts are blocked from new requests
 */
// These were originally written for a per-minute cron (see the state-machine
// comment above) — this project's Vercel plan only allows a daily cron
// schedule (see vercel.json), so a delivery is only ever re-checked once a
// day. Minute-scale thresholds under a daily sweep would be permanently
// past-due the moment they're checked — every unpaid delivery would hit
// cancel_due on the very first run regardless of how recently it was
// assigned. Rescaled to hour/day thresholds so the daily sweep is actually
// meaningful. The "Pay Now" prompt shown immediately in the UI once a
// driver is assigned is the real first line of defense; this is the
// backstop for requesters who never pay at all.
export const DELIVERY_TIMEOUT = {
  /** Seconds after driver assignment before first reminder push */
  REMIND_1_SECS: 3 * 3600,          // 3 hours

  /** Seconds after driver assignment before second reminder push */
  REMIND_2_SECS: 12 * 3600,         // 12 hours

  /** Seconds after driver assignment before auto-cancel (if not in_transit) */
  CANCEL_SECS: 24 * 3600,           // 24 hours

  /** Extra seconds before cancel if driver is already in transit */
  IN_TRANSIT_GRACE_EXTRA: 24 * 3600, // extra 24h grace (total 48h) — a driver already en route shouldn't get yanked back for the requester's non-payment

  /**
   * Buffer for MoMo confirmation lag.
   * The cancel check requires that CANCEL_SECS + this buffer have passed
   * before actually cancelling. This gives a genuine in-flight MoMo
   * payment time to confirm via webhook before we pull the trigger.
   */
  PAYMENT_CONFIRM_BUFFER_SECS: 90,  // 90 seconds MoMo lag buffer

  /** Rolling window for counting non-payment cancellations per user */
  ABUSE_WINDOW_SECS: 86400,         // 24 hours

  /** Number of non-payment cancellations in the window before flagging */
  ABUSE_MAX_STRIKES: 3,

  /**
   * Extra seconds to subtract from CANCEL_SECS for abusive accounts.
   * Negative value = shorter window (they must pay faster).
   * Set to 0 to not change the timer, use ABUSE_RESTRICT_NEW instead.
   */
  ABUSE_TIMEOUT_REDUCTION: 120,     // Flagged users get 2 min less time

  /** Block flagged accounts from requesting new deliveries */
  ABUSE_RESTRICT_NEW: true,
} as const;

export type DeliveryTimeoutPhase =
  | 'pending_payment'   // driver assigned, waiting for payment
  | 'remind_1'          // first reminder sent
  | 'remind_2'          // second reminder sent
  | 'cancel_due'        // past cancel threshold, awaiting processing
  | 'paid'              // payment confirmed
  | 'cancelled_timeout' // cancelled due to non-payment

/** Returns which timeout phase a delivery is in given assigned_at timestamp */
export function getTimeoutPhase(
  assignedAt: string,
  paymentConfirmed: boolean,
  isInTransit: boolean,
): DeliveryTimeoutPhase {
  if (paymentConfirmed) return 'paid';

  const elapsed = (Date.now() - new Date(assignedAt).getTime()) / 1000;
  const cancelThreshold = isInTransit
    ? DELIVERY_TIMEOUT.CANCEL_SECS + DELIVERY_TIMEOUT.IN_TRANSIT_GRACE_EXTRA
    : DELIVERY_TIMEOUT.CANCEL_SECS;

  const effectiveCancelThreshold =
    cancelThreshold + DELIVERY_TIMEOUT.PAYMENT_CONFIRM_BUFFER_SECS;

  if (elapsed >= effectiveCancelThreshold) return 'cancel_due';
  if (elapsed >= DELIVERY_TIMEOUT.REMIND_2_SECS) return 'remind_2';
  if (elapsed >= DELIVERY_TIMEOUT.REMIND_1_SECS) return 'remind_1';
  return 'pending_payment';
}

/** Seconds remaining until auto-cancel (can be negative if overdue) */
export function secondsUntilCancel(assignedAt: string, isInTransit: boolean): number {
  const elapsed = (Date.now() - new Date(assignedAt).getTime()) / 1000;
  const cancelThreshold = isInTransit
    ? DELIVERY_TIMEOUT.CANCEL_SECS + DELIVERY_TIMEOUT.IN_TRANSIT_GRACE_EXTRA
    : DELIVERY_TIMEOUT.CANCEL_SECS;
  return Math.round(cancelThreshold - elapsed);
}
