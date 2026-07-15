'use client';

import { useState, useCallback, useEffect } from 'react';
import { NotificationDrawer, type Notification } from './NotificationDrawer';
import { showToast, requestBrowserNotificationPermission } from './NotificationToast';
import { createClient } from '@/lib/supabase/client';

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
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch {
    // Best-effort — the in-app bell/realtime channel still works either way.
  }
}

export function NotificationBell({ initialUnreadCount = 0 }: NotificationBellProps) {
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

  const ensureLoaded = useCallback(async () => {
    if (loaded) return;
    try {
      const res = await fetch('/api/notifications');
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
  }, [loaded]);

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
    await fetch('/api/notifications', { method: 'PATCH' });
  }, []);

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
