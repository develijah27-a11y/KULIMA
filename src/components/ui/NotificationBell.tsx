'use client';

import { useState, useCallback, useEffect } from 'react';
import { NotificationDrawer, Notification } from './NotificationDrawer';
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

export function NotificationBell({ initialUnreadCount = 0 }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loaded, setLoaded] = useState(false);

  // Ask for browser notification permission + subscribe to realtime inserts
  useEffect(() => {
    requestBrowserNotificationPermission();

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
