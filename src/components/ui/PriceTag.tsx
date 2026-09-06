'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface PriceTagProps {
  value: number;
  currency?: string;
  changePercent?: number | null;
  previousValue?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceTag({
  value,
  currency = 'UGX',
  changePercent,
  previousValue,
  className,
  size = 'md',
}: PriceTagProps) {
  const computedChange =
    changePercent ??
    (previousValue != null && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : null);

  const isUp = computedChange != null && computedChange > 0;
  const isDown = computedChange != null && computedChange < 0;

  const formatted = new Intl.NumberFormat('en-UG').format(Math.round(value));

  const sizes: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-3xl font-extrabold',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('text-harvest font-mono', sizes[size])}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {currency} {formatted}
      </span>
      {computedChange != null && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-semibold',
            isUp && 'text-sprout',
            isDown && 'text-clay',
            computedChange === 0 && 'text-[var(--color-text-muted)]'
          )}
        >
          {isUp && <ArrowUp className="w-3 h-3" />}
          {isDown && <ArrowDown className="w-3 h-3" />}
          {computedChange === 0 && <Minus className="w-3 h-3" />}
          {Math.abs(computedChange).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
