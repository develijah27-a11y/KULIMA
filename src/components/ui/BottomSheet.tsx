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
        className="absolute inset-0 bg-soil/80 backdrop-blur-sm animate-in fade-in duration-200"
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
          'shadow-shadow-modal p-5 animate-in slide-up-from-bottom duration-250'
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface2" />
        {title && (
          <h2
            className="font-headline text-lg font-bold text-cream mb-4"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
