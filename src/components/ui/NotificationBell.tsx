'use client';

import { useState, useCallback, useEffect } from 'react';
import { NotificationDrawer, type Notification } from './NotificationDrawer';
import { showToast, requestBrowserNotificationPermission } from './NotificationToast';
import { createClient } from '@/lib/supabase/client';
import { UNREAD_COUNT_EVENT } from '@/components/layout/useLiveUnreadBadge';

interface ApiNotif {
  id: string;
  type: string;
  title: string;
  body: string;
  sentAt: string;
  read: boolean;
}

interface NotificationBellProps {
  initialUnreadCount?: number;
  /** Which role dashboard this bell is mounted in — a notification tagged
   *  for a different role (or untagged, which always shows) is filtered out
   *  so switching roles on one account doesn't leak another role's alerts. */
  currentRole?: string;
}

// VAPID public keys are base64url — the Push API needs them as a raw byte
// array instead.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Subscribes this browser/device to real push notifications (delivery jobs,
// low-stock alerts, etc. — anything the server sends via web-push) and saves
// the subscription server-side. Only runs once permission is actually
// granted; no-ops silently if push isn't supported or the VAPID key isn't
// configured, so this never blocks the rest of the notification bell.
async function ensurePushSubscription() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }
    // This effect re-runs on every NotificationBell mount — every role
    // switch, every hard refresh — and re-POSTing an unchanged subscription
    // re-triggers a DB upsert for nothing. Skip it once this exact endpoint
    // is already known-saved for this browser session.
    const syncedKey = 'agrinova-push-synced';
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(syncedKey) === sub.endpoint) return;
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(syncedKey, sub.endpoint);
  } catch {
    // Best-effort — the in-app bell/realtime channel still works either way.
  }
}

export function NotificationBell({ initialUnreadCount = 0, currentRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loaded, setLoaded] = useState(false);

  // Ask for browser notification permission + subscribe to realtime inserts
  useEffect(() => {
    requestBrowserNotificationPermission();
    // If permission was already granted in a past session, this resolves
    // immediately; if it was just granted above, give the browser a tick
    // to settle before subscribing.
    setTimeout(ensurePushSubscription, 300);

    const supabase = createClient();
    let userId: string | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userId = user.id;

      const channel = supabase
        .channel('notif-bell-' + userId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload: any) => {
            const n = payload.new as any;
            // Realtime can only filter on user_id server-side (no OR/IS NULL
            // support) — a role-tagged row meant for a different dashboard
            // still arrives here, so drop it client-side before it shows.
            if (n.role && currentRole && n.role !== currentRole) return;
            // Add to the drawer list
            setNotifications(prev => [{
              id: n.id,
              title: n.title,
              body: n.body,
              read: false,
              createdAt: n.created_at ?? new Date().toISOString(),
              type: n.type,
            }, ...prev]);
            setUnreadCount(c => c + 1);
            // Pop a toast
            showToast({ title: n.title, body: n.body, type: n.type });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  // Broadcast our unread count so the sidebar/mobile-nav "Notifications"
  // badge — a static number baked in at server-render time — stays in sync.
  // Tagged with source: 'bell' so our own listener below (which exists for
  // *other* surfaces, e.g. a /*/notifications page marking everything read
  // server-side) can ignore echoes of its own broadcasts.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(UNREAD_COUNT_EVENT, { detail: { count: unreadCount, source: 'bell' } }));
  }, [unreadCount]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { count, source } = (e as CustomEvent<{ count: number; source?: string }>).detail;
      if (source === 'bell') return;
      setUnreadCount(count);
      setLoaded(false);
    };
    window.addEventListener(UNREAD_COUNT_EVENT, handler);
    return () => window.removeEventListener(UNREAD_COUNT_EVENT, handler);
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (loaded) return;
    try {
      const url = currentRole ? `/api/notifications?role=${encodeURIComponent(currentRole)}` : '/api/notifications';
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      const items: Notification[] = (json.data ?? []).map((n: ApiNotif) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.sentAt,
        type: n.type as Notification['type'],
      }));
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
      setLoaded(true);
    } catch {}
  }, [loaded, currentRole]);

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Best-effort — the dot may reappear on next load if this failed, but
      // the notification itself was already seen.
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: currentRole }),
    });
  }, [currentRole]);

  return (
    <div onClick={ensureLoaded}>
      <NotificationDrawer
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onMarkRead={handleMarkRead}
      />
    </div>
  );
}
