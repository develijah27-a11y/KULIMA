/**
 * LazyLoad Component
 * Only renders children when they enter the viewport
 * Reduces initial bundle size and improves TTI (Time to Interactive)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createIntersectionObserver } from '@/lib/performance';

interface LazyLoadProps {
  children: React.ReactNode;
  /** Height to reserve for content before it loads (prevents layout shift) */
  height?: number | string;
  /** Root margin for intersection observer (load before entering viewport) */
  rootMargin?: string;
  /** Fallback to show while loading */
  fallback?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * LazyLoad component using Intersection Observer
 * 
 * Usage:
 * ```tsx
 * <LazyLoad height={300} fallback={<Skeleton />}>
 *   <HeavyComponent />
 * </LazyLoad>
 * ```
 */
export function LazyLoad({
  children,
  height,
  rootMargin = '200px',
  fallback = null,
  className = '',
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = createIntersectionObserver(
      (entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  const style = height
    ? { minHeight: typeof height === 'number' ? `${height}px` : height }
    : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {isVisible ? children : fallback}
    </div>
  );
}

/**
 * LazySection component - wrapper for sections of the page
 * Includes default skeleton fallback
 */
export function LazySection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <LazyLoad
      height={200}
      fallback={
        <div className="dash-skeleton w-full h-48 rounded-xl" />
      }
      className={className}
    >
      {children}
    </LazyLoad>
  );
}
