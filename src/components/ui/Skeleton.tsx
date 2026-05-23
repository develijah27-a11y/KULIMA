'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={cn('rounded-xl skeleton', className)} />;
}

// ── Fixed-size presets ──
export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-surface2 p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-8" />
    </div>
  );
}

export function WeatherCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-surface2 p-5 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
      <Skeleton className="h-10 w-20 mx-auto" />
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 flex-1" />
        ))}
      </div>
    </div>
  );
}

export function PriceTickerSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 rounded-xl" />
      ))}
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-12 rounded-xl" />
      ))}
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-surface2 p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-6 w-28" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
