/**
 * Optimized Skeleton Components
 * GPU-accelerated loading states for better perceived performance
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'dash' | 'orange';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const baseClass = variant === 'dash' ? 'dash-skeleton' : variant === 'orange' ? 'orange-skeleton' : 'skeleton';
  return <div className={`${baseClass} ${className}`} aria-busy="true" aria-live="polite" />;
};

/**
 * Card skeleton with common dashboard dimensions
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`dash-skeleton ${className}`} style={{ height: '200px' }} />
);

/**
 * Stat card skeleton (4-column grid item)
 */
export const StatSkeleton: React.FC = () => (
  <div className="dash-skeleton" style={{ 
    height: '120px',
    borderTop: '3px solid var(--color-border)' 
  }} />
);

/**
 * Table row skeleton
 */
export const TableRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-5 py-3">
    <Skeleton className="w-10 h-10 rounded-xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-4 w-20" />
  </div>
);

/**
 * Full dashboard skeleton layout
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    {/* Weather card skeleton */}
    <CardSkeleton className="h-40" />
    
    {/* Stats grid skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatSkeleton />
      <StatSkeleton />
      <StatSkeleton />
      <StatSkeleton />
    </div>
    
    {/* AI Banner skeleton */}
    <CardSkeleton className="h-24" />
    
    {/* Two-column layout skeleton */}
    <div className="grid lg:grid-cols-2 gap-6">
      <CardSkeleton className="h-64" />
      <CardSkeleton className="h-64" />
    </div>
  </div>
);

/**
 * List skeleton (for marketplace, orders, etc)
 */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} />
    ))}
  </div>
);
