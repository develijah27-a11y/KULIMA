'use client';

import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'elevated';
  onClick?: () => void;
}

export function Card({
  variant = 'default',
  className,
  onClick,
  children,
  ...props
}: CardProps) {
  const variants: Record<string, string> = {
    default: 'bg-surface border border-surface2 shadow-[var(--shadow-xs)]',
    surface: 'bg-surface2 border border-[var(--color-border)]',
    elevated: 'bg-surface border border-surface2 shadow-[var(--shadow-card)]',
  };

  const clickable = onClick
    ? 'cursor-pointer hover:bg-surface2 transition-all duration-150 active:scale-[0.98]'
    : '';

  return (
    <div
      className={cn('rounded-2xl p-5', variants[variant], clickable, className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-3', className)}>
      <h3
        className="font-semibold text-[var(--color-text)] text-lg"
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {title}
      </h3>
      {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-4 pt-3 border-t border-surface2', className)}>{children}</div>;
}
