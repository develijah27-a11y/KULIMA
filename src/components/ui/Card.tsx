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
    default: 'bg-surface border border-surface2',
    surface: 'bg-surface2 border border-surface',
    elevated: 'bg-surface border border-surface2 shadow-shadow-card',
  };

  const clickable = onClick
    ? 'cursor-pointer hover:bg-surface2 transition-all active:scale-[0.99]'
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
        className="font-semibold text-cream text-lg"
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {title}
      </h3>
      {subtitle && <p className="text-sm text-cream/50 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-4 pt-3 border-t border-surface2', className)}>{children}</div>;
}
