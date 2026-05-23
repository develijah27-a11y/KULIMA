'use client';

import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5', className)}>
      <div>
        <h1
          className="text-xl font-bold text-cream"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-sm text-cream/50 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
