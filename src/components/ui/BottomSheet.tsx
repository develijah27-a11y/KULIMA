'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-soil/75 backdrop-blur-sm"
        style={{ animation: 'modalBackdropIn 0.2s ease forwards' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* sheet */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
        className={cn(
          'relative z-10 w-full max-w-[92vw] rounded-t-2xl bg-surface border-t border-surface2',
          'shadow-[var(--shadow-modal)] p-5'
        )}
        style={{ animation: 'modalSheetIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)] opacity-60" />
        {title && (
          <h2
            className="text-lg font-bold text-[var(--color-text)] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
