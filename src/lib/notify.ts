import { sendPushToUsers } from '@/lib/push';

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
export async function notifyUsers(supabase: any, notifications: NotifyInput[]): Promise<{ ok: boolean }> {
  if (notifications.length === 0) return { ok: true };

  try {
    const { error } = await supabase.from('notifications').insert(
      notifications.map(n => ({
        user_id: n.userId,
        role: n.role ?? null,
        type: n.type,
        title: n.title,
        body: n.body,
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

  // Pushes are best-effort and independent per recipient — one failing
  // subscription must never block the in-app row (already written above)
  // or another recipient's push.
  await Promise.all(
    notifications.map(n =>
      sendPushToUsers([n.userId], { title: n.title, body: n.body, url: n.url ?? '/dashboard' }).catch(() => {}),
    ),
  );

  return { ok: true };
}

export async function notifyUser(supabase: any, notification: NotifyInput): Promise<{ ok: boolean }> {
  return notifyUsers(supabase, [notification]);
}
