'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'gold' | 'red' | 'blue' | 'purple' | 'neutral';
  className?: string;
}

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  const variants: Record<string, string> = {
    green:   'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40',
    gold:    'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-700/35',
    red:     'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/25 dark:text-red-400 dark:border-red-700/35',
    blue:    'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/25 dark:text-sky-300 dark:border-sky-700/35',
    purple:  'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/25 dark:text-violet-300 dark:border-violet-700/35',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50',
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
