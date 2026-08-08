'use client';

import { useState, useEffect } from 'react';
import { X, Bell, Truck, MessageCircle, Users, TrendingUp, Cloud, Package } from 'lucide-react';

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  type?: string;
}

// Module-level listeners so showToast() can be called from anywhere
// (e.g. NotificationBell) without prop-drilling.
let _listeners: Array<(t: ToastItem) => void> = [];

export function showToast(toast: Omit<ToastItem, 'id'>) {
  const item: ToastItem = { ...toast, id: Math.random().toString(36).slice(2) };
  _listeners.forEach(fn => fn(item));

  // OS-level browser notification when the tab is in background
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`Cropify — ${toast.title}`, {
        body: toast.body,
        icon: '/icon-192.png',
        tag: item.id,
      });
    } catch { /* silently ignored — some browsers block Notification outside SW */ }
  }
}

export function requestBrowserNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  delivery: <Truck size={15} />,
  message:  <MessageCircle size={15} />,
  group:    <Users size={15} />,
  price:    <TrendingUp size={15} />,
  weather:  <Cloud size={15} />,
  stock:    <Package size={15} />,
};

export function NotificationToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (item: ToastItem) => {
      setToasts(prev => [...prev.slice(-4), item]); // cap at 5 visible
      const tid = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, 5000);
      return () => clearTimeout(tid);
    };
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(fn => fn !== listener); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: 68,
        right: 12,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          style={{
            pointerEvents: 'all',
            width: 300,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-mid)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
            padding: '11px 12px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            animation: 'toastIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* App icon + type icon */}
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #166B3A 0%, #2FA34F 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            {TYPE_ICON[t.type ?? ''] ?? <Bell size={15} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Cropify label */}
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--color-primary)', margin: '0 0 1px' }}>
              Cropify
            </p>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', margin: 0, lineHeight: 1.3 }}>
              {t.title}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {t.body}
            </p>
          </div>

          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-muted)', flexShrink: 0, lineHeight: 1, marginTop: 1 }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
