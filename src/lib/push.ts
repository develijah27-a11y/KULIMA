import webpush from 'web-push';
import { createServiceRoleClient } from '@/lib/supabase/server';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:support@agrinova.app';
  if (!publicKey || !privateKey) return; // push simply no-ops until keys are set
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Sends a real OS-level push notification to every device a user has
// subscribed on. Best-effort: failures for one subscription (expired,
// user revoked permission, etc.) don't block the others, and this never
// throws — callers already write the in-app `notifications` row separately,
// so a push failure should never take down the calling request.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  ensureConfigured();
  if (!configured || userIds.length === 0) return;

  const service = createServiceRoleClient();
  const { data: subs } = await (service.from as any)('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(subs.map(async (sub: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      );
    } catch (err: any) {
      // 404/410 means the browser/OS has permanently invalidated this
      // subscription (uninstalled, permission revoked, etc.) — clean it up
      // so future sends don't keep paying the round-trip cost for it.
      if (err?.statusCode === 404 || err?.statusCode === 410) staleIds.push(sub.id);
    }
  }));

  if (staleIds.length > 0) {
    await (service.from as any)('push_subscriptions').delete().in('id', staleIds);
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  return sendPushToUsers([userId], payload);
}
