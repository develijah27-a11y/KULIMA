/**
 * VirtualList Component
 * Renders only visible items for large lists (100+ items)
 * Drastically improves performance for marketplace, orders, etc.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { throttle } from '@/lib/performance';

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Number of items to render outside viewport (buffer) */
  overscan?: number;
  /** Additional className for container */
  className?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state component */
  emptyState?: React.ReactNode;
}

/**
 * VirtualList component with windowing
 * Only renders items visible in the viewport + buffer
 * 
 * Usage:
 * ```tsx
 * <VirtualList
 *   items={listings}
 *   itemHeight={80}
 *   containerHeight={600}
 *   renderItem={(listing, index) => <ListingCard key={listing.id} listing={listing} />}
 * />
 * ```
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  isLoading = false,
  emptyState = null,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Throttled scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = throttle(() => {
      setScrollTop(container.scrollTop);
    }, 16); // ~60fps

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Show empty state
  if (!isLoading && items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className={className} style={{ height: containerHeight }}>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="dash-skeleton" style={{ height: itemHeight }} />
          ))}
        </div>
      </div>
    );
  }

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight, contain: 'strict' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                height: itemHeight,
                width: '100%',
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Simpler auto-height virtual list for dynamic item heights
 * Less efficient but handles variable heights
 */
export function AutoVirtualList<T>({
  items,
  estimatedItemHeight = 80,
  containerHeight,
  renderItem,
  className = '',
}: Omit<VirtualListProps<T>, 'itemHeight' | 'overscan'> & {
  estimatedItemHeight?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeights = useRef<number[]>([]);

  // Estimate visible range
  const avgHeight = estimatedItemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / avgHeight) - 2);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / avgHeight) + 2
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = throttle(() => {
      setScrollTop(container.scrollTop);
    }, 16);

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ paddingTop: startIndex * avgHeight }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div key={actualIndex}>
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
