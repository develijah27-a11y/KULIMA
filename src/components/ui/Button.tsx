'use client';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-soil disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary:   'bg-sprout text-white hover:bg-leaf focus:ring-sprout',
    secondary: 'bg-surface2 text-[var(--color-text)] border border-[var(--color-border-mid)] hover:bg-[var(--color-surface-3)] focus:ring-sprout',
    ghost:     'text-sprout hover:bg-sprout/10 focus:ring-sprout',
    danger:    'bg-clay text-white hover:bg-[#B91C1C] focus:ring-clay',
    outline:   'border border-sprout text-sprout hover:bg-sprout/10 focus:ring-sprout',
  };

  const sizes: Record<string, string> = {
    sm: 'min-h-[44px] px-3 py-2 text-sm',
    md: 'min-h-[48px] px-5 py-2.5 text-sm',
    lg: 'min-h-[52px] px-7 py-3 text-base',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin text-lg leading-none">⟳</span>
          <span>Loading…</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
