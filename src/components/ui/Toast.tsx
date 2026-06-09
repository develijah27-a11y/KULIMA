'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  addToastFn?.({ message, type });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (toast) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 'min(calc(100vw - 32px), 360px)',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => remove(toast.id)} />
      ))}
    </div>
  );
}

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--color-success-bg)', border: 'var(--color-success)',   icon: 'var(--color-success)'  },
  error:   { bg: 'var(--color-danger-bg)',  border: 'var(--color-danger)',    icon: 'var(--color-danger)'   },
  warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning)',   icon: 'var(--color-warning)'  },
  info:    { bg: 'var(--color-info-bg)',    border: 'var(--color-info)',      icon: 'var(--color-info)'     },
};

const ICONS: Record<ToastType, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = TYPE_STYLES[toast.type];
  const Icon = ICONS[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        background: s.bg,
        border: `1px solid ${s.border}`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <Icon size={16} style={{ color: s.icon, flexShrink: 0, marginTop: 1 }} />
      <p style={{ flex: 1, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.4 }}>
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: 'var(--color-text-muted)', flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
