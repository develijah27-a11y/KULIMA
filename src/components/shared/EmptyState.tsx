'use client';

import { cn } from '@/lib/utils';

export function EmptyState({
  emoji,
  title,
  description,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {emoji && <div className="text-4xl mb-3">{emoji}</div>}
      <p className="font-semibold text-[var(--color-text)] text-sm">{title}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
