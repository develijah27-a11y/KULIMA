'use client';

import React, { useState, useEffect, useCallback, type JSX } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, Truck, TrendingUp, Tag, Banknote, Settings, CloudRain, Bug,
  Microscope, CreditCard, Check, CheckCheck, RefreshCw, Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UNREAD_COUNT_EVENT } from '@/components/layout/useLiveUnreadBadge';

export interface NotificationItem {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  read: boolean;
  created_at: string;
  href?: string;
}

interface Props {
  initialNotifications: NotificationItem[];
  role?: string;
  userId?: string;
  title?: string;
  emptySubtitle?: string;
}

const TYPE_ICONS: Record<string, JSX.Element> = {
  delivery: <Truck size={17} />,
  price:    <TrendingUp size={17} />,
  offer:    <Tag size={17} />,
  loan:     <Banknote size={17} />,
  system:   <Settings size={17} />,
  rain:     <CloudRain size={17} />,
  pest:     <Bug size={17} />,
  disease:  <Microscope size={17} />,
  payment:  <CreditCard size={17} />,
};

function formatTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString('en-UG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function InteractiveNotificationsView({
  initialNotifications,
  role,
  userId,
  title = 'Notifications',
  emptySubtitle = 'Activity updates and alerts will appear here.',
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = items.filter(n => !n.read).length;

  // Broadcast unread count changes across the entire app
  const broadcastUnread = useCallback((count: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(UNREAD_COUNT_EVENT, { detail: { count, source: 'notifications-page' } })
      );
    }
  }, []);

  // Mark all as read function
  const markAllRead = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    broadcastUnread(0);

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role || undefined }),
      });
    } catch (e) {
      console.warn('[Cropify] Failed to sync mark all read:', e);
    }
  }, [role, broadcastUnread]);

  // Mark single item as read
  const markItemRead = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setItems(prev => {
      const updated = prev.map(n => (n.id === id ? { ...n, read: true } : n));
      const remainingUnread = updated.filter(n => !n.read).length;
      broadcastUnread(remainingUnread);
      return updated;
    });

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn('[Cropify] Failed to sync notification read:', err);
    }
  }, [broadcastUnread]);

  // Auto-mark notifications as read on page load and clear the unread badge immediately
  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllRead();
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      broadcastUnread(0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription for incoming notifications
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifs-live-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const n = payload.new as any;
          if (n.role && role && n.role !== role) return;

          setItems(prev => {
            const exists = prev.some(item => item.id === n.id);
            if (exists) return prev;
            const newItem: NotificationItem = {
              id: n.id,
              title: n.title,
              message: n.message,
              body: n.body,
              type: n.type,
              read: false,
              created_at: n.created_at ?? new Date().toISOString(),
              href: n.href,
            };
            const nextList = [newItem, ...prev];
            broadcastUnread(nextList.filter(x => !x.read).length);
            return nextList;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role, broadcastUnread]);

  // Manual pull-to-refresh / reload button
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const url = role ? `/api/notifications?role=${encodeURIComponent(role)}` : '/api/notifications';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setItems(json.data);
          broadcastUnread(json.data.filter((n: any) => !n.read).length);
        }
      }
    } catch {}
    setIsRefreshing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1
            className="text-2xl font-black tracking-tight flex items-center gap-2"
            style={{ color: 'var(--d-text)', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}
          >
            {title}
            {unreadCount > 0 && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-extrabold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--d-muted)' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : `${items.length} total notifications`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: 'var(--color-primary-bg)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-border-mid)',
                cursor: 'pointer',
              }}
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh notifications"
            className="p-2 rounded-xl text-xs transition-transform active:scale-95"
            style={{
              background: 'var(--d-card)',
              color: 'var(--d-muted)',
              border: '1px solid var(--d-border)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: 'var(--d-card)',
            borderRadius: 20,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'var(--color-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--color-primary)',
            }}
          >
            <Sparkles size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--d-text)' }}>All caught up!</p>
          <p style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 6, maxWidth: 320, margin: '6px auto 0' }}>
            {emptySubtitle}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--d-card)',
            borderRadius: 20,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
            overflow: 'hidden',
          }}
        >
          {items.map((n, i) => {
            const icon = TYPE_ICONS[n.type ?? 'system'] ?? <Bell size={17} />;
            const isUnread = !n.read;

            const cardContent = (
              <div
                key={n.id}
                onClick={() => isUnread && markItemRead(n.id)}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  borderBottom: i < items.length - 1 ? '1px solid var(--d-border)' : 'none',
                  background: isUnread ? 'var(--color-primary-bg)' : 'transparent',
                  transition: 'background 0.15s ease',
                  cursor: n.href ? 'pointer' : isUnread ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: isUnread ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isUnread ? '#fff' : 'var(--d-muted)',
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: isUnread ? 800 : 600,
                        color: 'var(--d-text)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {n.title ?? n.message ?? 'Notification'}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--d-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatTime(n.created_at)}
                    </span>
                  </div>

                  {n.body && (
                    <p
                      style={{
                        fontSize: 13,
                        color: isUnread ? 'var(--d-text)' : 'var(--d-muted)',
                        margin: '0 0 6px',
                        lineHeight: 1.45,
                      }}
                    >
                      {n.body}
                    </p>
                  )}
                </div>

                {isUnread && (
                  <button
                    onClick={(e) => markItemRead(n.id, e)}
                    title="Mark as read"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      border: '1px solid var(--color-border-mid)',
                      background: 'var(--d-card)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={13} />
                  </button>
                )}
              </div>
            );

            if (n.href) {
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => markItemRead(n.id)}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  {cardContent}
                </Link>
              );
            }

            return <React.Fragment key={n.id}>{cardContent}</React.Fragment>;
          })}
        </div>
      )}
    </div>
  );
}
