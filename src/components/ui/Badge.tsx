'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'gold' | 'red' | 'blue' | 'purple' | 'neutral';
  className?: string;
}

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  const variants: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40',
    gold: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700/30',
    red: 'bg-green-100 text-green-900 border border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-600/40',
    blue: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700/30',
    purple: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40',
    neutral: 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/15 dark:text-green-400 dark:border-green-800/40',
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
