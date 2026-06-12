/**
 * Performance Utilities
 * Client-side performance monitoring and optimization helpers
 */

/**
 * Debounce function to limit how often a function can fire
 * Useful for scroll, resize, and input handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function fires at most once per interval
 * Better than debounce for continuous events like scroll
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load components only when they enter viewport
 * Uses Intersection Observer API
 */
export function createIntersectionObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {},
    } as any;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, options || { rootMargin: '50px' });

  return observer;
}

/**
 * Measure component render time (development only)
 */
export function measureRender(componentName: string, startTime: number) {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const duration = performance.now() - startTime;
    if (duration > 16) {
      // Log if render takes longer than 1 frame (16ms at 60fps)
      console.warn(
        `[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`
      );
    }
  }
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string) {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get connection quality (useful for adaptive loading)
 */
export function getConnectionQuality(): 'fast' | 'slow' | 'offline' {
  if (typeof navigator === 'undefined') return 'fast';

  if (!navigator.onLine) return 'offline';

  // @ts-ignore - NetworkInformation API
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) return 'fast';

  const effectiveType = connection.effectiveType;

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'slow';
  }

  return 'fast';
}

/**
 * Request Idle Callback polyfill for non-critical tasks
 */
export function runWhenIdle(callback: () => void, timeout = 2000) {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Batch multiple state updates to reduce renders
 */
export function batchUpdates<T>(updates: (() => void)[]): void {
  // In React 18+, updates are automatically batched
  updates.forEach((update) => update());
}

/**
 * Performance marks for key user journeys
 */
export const PerformanceMarks = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },

  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name);
        const duration = measures[measures.length - 1]?.duration;
        if (duration && duration > 100) {
          console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        }
      } catch (e) {
        // Marks may not exist
      }
    }
  },
};
