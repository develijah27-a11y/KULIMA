'use client';

import { useState, useCallback } from 'react';
import { NotificationDrawer, Notification } from './NotificationDrawer';

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
    // No dedicated single-mark endpoint — optimistic update only for now
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
