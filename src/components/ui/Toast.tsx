'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function showToast(toast: Omit<Toast, 'id'>) {
  addToastFn?.(toast);
}

export function useToast() {
  return { showToast };
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
    return () => {
      addToastFn = null;
    };
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => remove(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-sprout flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-clay flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-harvest flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
  };

  const bgClasses: Record<ToastType, string> = {
    success: 'bg-sprout/10 border-sprout/25',
    error: 'bg-clay/10 border-clay/25',
    warning: 'bg-harvest/10 border-harvest/25',
    info: 'bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        'backdrop-blur-md shadow-shadow-card animate-in slide-up-from-bottom duration-200',
        bgClasses[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-cream leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-cream/40 hover:text-cream transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}