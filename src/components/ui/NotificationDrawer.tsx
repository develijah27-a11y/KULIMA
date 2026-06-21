'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface Notification {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
  type?: 'order' | 'price' | 'weather' | 'system' | 'message';
}

interface NotificationDrawerProps {
  notifications: Notification[];
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  order:   '📦',
  price:   '💰',
  weather: '🌤️',
  message: '💬',
  system:  '🔔',
};

function groupByDate(notifications: Notification[]) {
  const today = new Date().toDateString();
  const todayItems = notifications.filter(n => new Date(n.createdAt).toDateString() === today);
  const earlierItems = notifications.filter(n => new Date(n.createdAt).toDateString() !== today);
  return { todayItems, earlierItems };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationDrawer({
  notifications,
  onMarkAllRead,
  onMarkRead,
}: NotificationDrawerProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;
  const { todayItems, earlierItems } = groupByDate(notifications);

  return (
    <>
      {/* Trigger bell button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="topbar-btn relative flex items-center justify-center rounded-lg"
        style={{
          width: 36, height: 36,
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-mid)',
          minHeight: 'unset', minWidth: 'unset',
        }}
      >
        <Bell size={17} style={{ color: unread > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-black text-white"
            style={{ width: 16, height: 16, fontSize: 9, background: 'var(--color-danger)' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          maxWidth: '92vw',
          zIndex: 9999,
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border-mid)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 14px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
              Notifications
            </h2>
            {unread > 0 && (
              <span
                style={{
                  fontSize: 10, fontWeight: 800,
                  padding: '1px 6px', borderRadius: 99,
                  background: 'var(--color-danger)',
                  color: '#fff',
                }}
              >
                {unread}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {unread > 0 && onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                title="Mark all as read"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 8,
                  border: '1px solid var(--color-border-mid)',
                  background: 'transparent', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700,
                  color: 'var(--color-primary)',
                  minHeight: 'unset', minWidth: 'unset',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <CheckCheck size={12} />
                All read
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--color-text-muted)',
                minHeight: 'unset', minWidth: 'unset',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Bell size={32} style={{ color: 'var(--color-text-hint)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                All caught up!
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-hint)', marginTop: 4 }}>
                No notifications yet.
              </p>
            </div>
          ) : (
            <>
              {todayItems.length > 0 && (
                <NotifGroup label="Today" items={todayItems} onMarkRead={onMarkRead} />
              )}
              {earlierItems.length > 0 && (
                <NotifGroup label="Earlier" items={earlierItems} onMarkRead={onMarkRead} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function NotifGroup({
  label, items, onMarkRead,
}: {
  label: string;
  items: Notification[];
  onMarkRead?: (id: string) => void;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--color-text-hint)',
          padding: '12px 16px 6px',
        }}
      >
        {label}
      </p>
      {items.map(n => <NotifItem key={n.id} n={n} onMarkRead={onMarkRead} />)}
    </div>
  );
}

function NotifItem({
  n, onMarkRead,
}: {
  n: Notification;
  onMarkRead?: (id: string) => void;
}) {
  const icon = TYPE_ICONS[n.type ?? 'system'] ?? '🔔';

  const content = (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '11px 16px',
        background: n.read ? 'transparent' : 'var(--color-primary-bg)',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background 0.1s',
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'var(--color-surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: 'var(--color-text)', lineHeight: 1.35 }}>
          {n.title}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4, marginTop: 2 }} className="line-clamp-2">
          {n.body}
        </p>
        <p style={{ fontSize: 10, color: 'var(--color-text-hint)', marginTop: 4 }}>
          {timeAgo(n.createdAt)}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {!n.read && onMarkRead && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMarkRead(n.id); }}
            title="Mark as read"
            style={{
              width: 22, height: 22, borderRadius: 6,
              border: '1px solid var(--color-border-mid)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-primary)',
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            <Check size={11} />
          </button>
        )}
        {n.href && (
          <ExternalLink size={11} style={{ color: 'var(--color-text-hint)', marginTop: 'auto' }} />
        )}
      </div>
    </div>
  );

  if (n.href) {
    return (
      <Link href={n.href} style={{ textDecoration: 'none', display: 'block' }}>
        {content}
      </Link>
    );
  }
  return content;
}
