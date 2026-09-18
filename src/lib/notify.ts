import { sendPushToUsers, type PushAction } from '@/lib/push';

export interface NotifyInput {
  userId: string;
  /** Tags which role dashboard this belongs to — omit for account-wide notices. */
  role?: string | null;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Where tapping the OS push notification should land. Defaults to /dashboard. */
  url?: string;
  /** Custom interactive action buttons (replaces browser's weird default "Unsubscribe" action) */
  actions?: PushAction[];
}

// Every in-app notification should go through here instead of a raw
// `.insert()` on `notifications` — this is the one place that guarantees a
// real push notification actually reaches the user's phone alongside the
// in-app bell entry. A bare `.insert()` only ever shows up if the user
// already has the app open (the realtime bell subscription), which is why
// so much of the app went silent outside of the couple of paths that
// remembered to call sendPushToUsers by hand.
//
// Notifying is inherently non-critical relative to whatever real action
// (payment, order status change, admin decision) triggered it — many
// callers run this in the same Promise.all as, or immediately after, a
// financial/state write that has already committed. This function must
// therefore never throw: a transient notifications-insert failure should
// never look like the triggering action itself failed. Callers that want to
// know about a failure can still inspect the return value; none currently
// need to, which is why this was a silent footgun in the first place.
function stripEmojis(text: string): string {
  if (!text) return '';
  return text.replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim();
}

// Derive professional user-experience actions without emojis matching exact notification domain
export function resolvePushActions(n: {
  type?: string;
  title?: string;
  body?: string;
  url?: string;
  actions?: PushAction[];
}): PushAction[] {
  if (n.actions && n.actions.length > 0) {
    return n.actions.map(a => ({
      ...a,
      title: stripEmojis(a.title) || a.title,
    }));
  }

  const type = (n.type || '').toLowerCase();
  const url = (n.url || '').toLowerCase();
  const title = (n.title || '').toLowerCase();
  const body = (n.body || '').toLowerCase();

  // 1. Account verification & KYC documents (prioritized so "unlock jobs" in KYC text never misclassifies as a job)
  if (
    type.includes('verify') ||
    type.includes('verification') ||
    type.includes('kyc') ||
    url.includes('/verify') ||
    url.includes('/verification') ||
    title.includes('verify') ||
    title.includes('verification') ||
    title.includes('national id') ||
    title.includes('kyc') ||
    body.includes('national id') ||
    body.includes('verify your account') ||
    body.includes('submit your national') ||
    body.includes('documents to unlock')
  ) {
    return [
      { action: 'verify_id', title: 'Verify ID' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 2. Farmer Groups & Co-operatives
  if (
    type.includes('group') ||
    url.includes('/groups') ||
    title.includes('group') ||
    title.includes('cooperative') ||
    body.includes('group message') ||
    body.includes('group chat') ||
    body.includes('cooperative')
  ) {
    return [
      { action: 'open_group', title: 'Open Group' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 3. Direct Messages & Chat
  if (
    type.includes('message') ||
    type.includes('chat') ||
    url.includes('/chat') ||
    url.includes('/messages') ||
    url.includes('/direct') ||
    title.includes('message') ||
    title.includes('chat')
  ) {
    return [
      { action: 'open_chat', title: 'View Message' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 4. Delivery & Transporter Jobs (Actual transport jobs only)
  if (
    type.includes('delivery') ||
    url.includes('/transporter/job') ||
    url.includes('/transporter/active') ||
    url.includes('/transporter/deliveries') ||
    title.includes('delivery request') ||
    title.includes('new delivery') ||
    title.includes('pickup job') ||
    title.includes('delivery assigned') ||
    body.includes('delivery request') ||
    body.includes('pickup ready') ||
    body.includes('cargo delivery')
  ) {
    return [
      { action: 'view_job', title: 'View Job' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 5. Orders & Produce Offers
  if (
    type.includes('order') ||
    type.includes('offer') ||
    url.includes('/orders') ||
    url.includes('/order') ||
    title.includes('order') ||
    title.includes('purchase') ||
    title.includes('offer') ||
    body.includes('new order') ||
    body.includes('order confirmed') ||
    body.includes('order placed')
  ) {
    return [
      { action: 'view_order', title: 'View Order' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 6. Payments, Escrow, Wallet, Payouts & Loans
  if (
    type.includes('payment') ||
    type.includes('escrow') ||
    type.includes('wallet') ||
    type.includes('loan') ||
    type.includes('payout') ||
    url.includes('/wallet') ||
    title.includes('payment') ||
    title.includes('escrow') ||
    title.includes('wallet') ||
    title.includes('payout') ||
    body.includes('payment received') ||
    body.includes('escrow released') ||
    body.includes('wallet credited')
  ) {
    return [
      { action: 'view_wallet', title: 'View Wallet' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 7. Pest, Disease & Plant Doctor Diagnosis
  if (
    type.includes('pest') ||
    type.includes('disease') ||
    type.includes('diagnosis') ||
    url.includes('/pathologist') ||
    title.includes('pest') ||
    title.includes('disease') ||
    title.includes('diagnosis') ||
    body.includes('pest alert') ||
    body.includes('diagnosis ready')
  ) {
    return [
      { action: 'view_diagnosis', title: 'View Diagnosis' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 8. Agronomy, Weather & Planting Alerts
  if (
    type.includes('weather') ||
    type.includes('planting') ||
    type.includes('season') ||
    type.includes('price') ||
    url.includes('/weather') ||
    url.includes('/planting') ||
    url.includes('/prices') ||
    title.includes('weather') ||
    title.includes('rain') ||
    title.includes('planting') ||
    title.includes('market price')
  ) {
    return [
      { action: 'view_alert', title: 'View Alert' },
      { action: 'open_app', title: 'Open App' },
    ];
  }

  // 9. Default Fallback
  return [
    { action: 'view_details', title: 'View Details' },
    { action: 'open_app', title: 'Open App' },
  ];
}

// Every in-app notification should go through here instead of a raw
// `.insert()` on `notifications` — this is the one place that guarantees a
// real push notification actually reaches the user's phone alongside the
// in-app bell entry.
export async function notifyUsers(supabase: any, notifications: NotifyInput[]): Promise<{ ok: boolean }> {
  if (notifications.length === 0) return { ok: true };

  try {
    const { error } = await supabase.from('notifications').insert(
      notifications.map(n => ({
        user_id: n.userId,
        role: n.role ?? null,
        type: n.type,
        title: stripEmojis(n.title),
        body: stripEmojis(n.body),
        data: n.data ?? null,
        read: false,
      })),
    );
    if (error) {
      console.error('[notify] insert failed:', error);
      return { ok: false };
    }
  } catch (err) {
    console.error('[notify] insert threw:', err);
    return { ok: false };
  }

  // Pushes are best-effort and independent per recipient
  await Promise.all(
    notifications.map(n =>
      sendPushToUsers([n.userId], {
        title: stripEmojis(n.title),
        body: stripEmojis(n.body),
        url: n.url ?? '/dashboard',
        type: n.type,
        actions: resolvePushActions(n),
      }).catch(() => {}),
    ),
  );

  return { ok: true };
}

export async function notifyUser(supabase: any, notification: NotifyInput): Promise<{ ok: boolean }> {
  return notifyUsers(supabase, [notification]);
}
