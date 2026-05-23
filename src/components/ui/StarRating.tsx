'use client';

import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  size = 20,
  readOnly = false,
  className,
}: StarRatingProps) {
  return (
    <div className={cn('inline-flex gap-0.5', className)} role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={cn(
              'transition-transform hover:scale-110 focus:outline-none',
              readOnly ? 'cursor-default' : 'cursor-pointer',
              filled ? '' : 'opacity-30'
            )}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-current={filled ? 'true' : undefined}
          >
            <Star
              size={size}
              className={cn(
                filled ? 'fill-harvest text-harvest' : 'text-cream/30'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
