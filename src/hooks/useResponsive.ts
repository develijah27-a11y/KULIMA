/**
 * Responsive hooks for mobile-first design
 * Optimized for farmers using phones in the field
 */

'use client';

import { useEffect, useState } from 'react';
import { throttle } from '@/lib/performance';

/**
 * Breakpoints aligned with Tailwind defaults
 */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook to detect current breakpoint
 * Returns true if viewport is at or above the specified breakpoint
 */
export function useMediaQuery(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Create throttled handler to avoid excessive re-renders
    const handler = throttle((e: MediaQueryListEvent) => {
      setMatches(e.matches);
    }, 100);

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', handler as any);
      return () => media.removeEventListener('change', handler as any);
    }
    // Legacy browsers
    else {
      media.addListener(handler as any);
      return () => media.removeListener(handler as any);
    }
  }, [breakpoint]);

  return matches;
}

/**
 * Hook to detect if device is mobile
 * Mobile = viewport width < 768px (Tailwind md breakpoint)
 */
export function useIsMobile(): boolean {
  const isMd = useMediaQuery('md');
  return !isMd;
}

/**
 * Hook to detect if device is tablet
 * Tablet = 768px <= viewport width < 1024px
 */
export function useIsTablet(): boolean {
  const isMd = useMediaQuery('md');
  const isLg = useMediaQuery('lg');
  return isMd && !isLg;
}

/**
 * Hook to detect if device is desktop
 * Desktop = viewport width >= 1024px
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('lg');
}

/**
 * Hook to get current viewport dimensions
 * Throttled to avoid performance issues
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = throttle(() => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
}

/**
 * Hook to detect touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

/**
 * Hook to get device type string
 * Returns: 'mobile' | 'tablet' | 'desktop'
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
