'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={cn('rounded-xl skeleton', className)} style={style} />;
}

// ── Fixed-size presets matching Cropify's card tokens ──
export function CardSkeleton() {
  return (
    <div
      className="p-5 space-y-3 rounded-2xl"
      style={{
        background: 'var(--d-card)',
        border: '1px solid var(--d-border)',
        boxShadow: 'var(--d-shadow-card, 0 4px 20px rgba(0,0,0,0.05))',
      }}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-8 rounded-lg" />
    </div>
  );
}

export function WeatherCardSkeleton() {
  return (
    <div
      className="p-5 space-y-4 rounded-2xl"
      style={{
        background: 'var(--d-card)',
        border: '1px solid var(--d-border)',
        boxShadow: 'var(--d-shadow-card, 0 4px 20px rgba(0,0,0,0.05))',
      }}
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
      <Skeleton className="h-9 w-24 mx-auto" />
      <div className="flex gap-2.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 flex-1 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function PriceTickerSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div
      className="p-4 space-y-3 rounded-2xl"
      style={{
        background: 'var(--d-card)',
        border: '1px solid var(--d-border)',
        boxShadow: 'var(--d-shadow-card, 0 4px 20px rgba(0,0,0,0.05))',
      }}
    >
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-6 w-28" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 space-y-2.5 rounded-xl"
            style={{
              background: 'var(--d-card)',
              border: '1px solid var(--d-border)',
              boxShadow: 'var(--d-shadow-card, 0 2px 12px rgba(0,0,0,0.04))',
            }}
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-2 w-24" />
          </div>
        ))}
      </div>
      {/* Main content rows */}
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function WalletSkeleton() {
  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      <Skeleton className="h-4 w-36 mt-2" />
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{
            background: 'var(--d-card)',
            border: '1px solid var(--d-border)',
          }}
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-xl"
      style={{
        background: 'var(--d-card)',
        border: '1px solid var(--d-border)',
      }}
    >
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-5 w-18 rounded-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
