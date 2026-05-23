'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'gold' | 'red' | 'blue' | 'purple' | 'neutral';
  className?: string;
}

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  const variants: Record<string, string> = {
    green: 'bg-sprout/15 text-sprout border border-sprout/25',
    gold: 'bg-harvest/15 text-harvest border border-harvest/25',
    red: 'bg-clay/15 text-clay border border-clay/25',
    blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
    neutral: 'bg-surface2 text-cream/70 border border-surface2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
