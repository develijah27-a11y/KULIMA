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
export async function notifyUsers(supabase: any, notifications: NotifyInput[]): Promise<void> {
  if (notifications.length === 0) return;

  await supabase.from('notifications').insert(
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

  // Pushes are best-effort and independent per recipient — one failing
  // subscription must never block the in-app row (already written above)
  // or another recipient's push.
  await Promise.all(
    notifications.map(n =>
      sendPushToUsers([n.userId], { title: n.title, body: n.body, url: n.url ?? '/dashboard' }).catch(() => {}),
    ),
  );
}

export async function notifyUser(supabase: any, notification: NotifyInput): Promise<void> {
  return notifyUsers(supabase, [notification]);
}
