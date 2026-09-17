'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const PUBLIC_ROUTES = [
  '/how-it-works',
  '/about',
  '/premium',
  '/faq',
  '/contact',
  '/auth/signin',
  '/auth/signup',
];

const ROUTES_BY_ROLE: Record<string, string[]> = {
  farmer: [
    '/farmer/marketplace',
    '/farmer/orders',
    '/farmer/prices',
  ],
  buyer: [
    '/buyer/listings',
    '/buyer/orders',
    '/buyer/contracts',
  ],
  admin: [
    '/admin/users',
    '/admin/verification',
    '/admin/analytics',
  ],
  supplier: [
    '/supplier/catalogue',
    '/supplier/orders',
    '/supplier/flash-deals',
  ],
  transporter: [
    '/transporter/job-queue',
    '/transporter/active',
    '/transporter/deliveries',
  ],
  pathologist: [
    '/pathologist/cases',
    '/pathologist/case-queue',
    '/pathologist/alerts',
  ],
  offtaker: [
    '/offtaker/contracts',
    '/offtaker/pipeline',
    '/offtaker/scorecard',
  ],
  groups: [
    '/groups/members',
    '/groups/bulk-orders',
    '/groups/listings',
  ],
};

const SHARED_ROUTES: string[] = [];
const ALL_ROLES = Object.keys(ROUTES_BY_ROLE);

function detectRole(pathname: string): string | null {
  for (const role of ALL_ROLES) {
    if (pathname === `/${role}` || pathname.startsWith(`/${role}/`)) return role;
  }
  return null;
}

// requestIdleCallback with a setTimeout fallback
const scheduleIdle: (cb: () => void, timeout?: number) => void =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb, timeout = 2500) => (window as any).requestIdleCallback(cb, { timeout })
    : (cb) => setTimeout(cb, 10);

function prefetchBatch(
  routes: string[],
  router: { prefetch: (href: string) => void },
  initialDelayMs = 3500,
  gapMs = 400,
  chunkSize = 2,
): ReturnType<typeof setTimeout>[] {
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (let i = 0; i < routes.length; i += chunkSize) {
    const chunk = routes.slice(i, i + chunkSize);
    const delay = initialDelayMs + (i / chunkSize) * gapMs;
    timers.push(
      setTimeout(() => {
        scheduleIdle(() => {
          chunk.forEach((r) => {
            try {
              router.prefetch(r);
            } catch {
              /* ignore */
            }
          });
        });
      }, delay),
    );
  }
  return timers;
}

export function PagePrefetcher() {
  const router = useRouter();
  const pathname = usePathname();
  const prefetchedRole = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prefetchedUrls = useRef<Set<string>>(new Set());

  // Global hover / touch listener: prefetch any clicked/hovered link at 0ms latency
  useEffect(() => {
    const handlePointerOver = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (prefetchedUrls.current.has(href)) return;
      prefetchedUrls.current.add(href);
      try {
        router.prefetch(href);
      } catch {}
    };

    document.addEventListener('mouseover', handlePointerOver, { passive: true });
    document.addEventListener('touchstart', handlePointerOver, { passive: true });

    return () => {
      document.removeEventListener('mouseover', handlePointerOver);
      document.removeEventListener('touchstart', handlePointerOver);
    };
  }, [router]);

  useEffect(() => {
    // Skip on explicit data-saver mode or slow 2G/3G constrained connections
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;

    const currentRole = detectRole(pathname);

    // Cancel pending timers from previous route transitions
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // On landing & public marketing pages: gently warm up key public routes after 3.5s idle
    if (!currentRole) {
      timers.current.push(...prefetchBatch(PUBLIC_ROUTES, router, 3500, 400, 2));
      return;
    }

    // Skip if role hasn't changed
    if (currentRole === prefetchedRole.current) return;
    prefetchedRole.current = currentRole;

    // Inside a role hub: warm up top 2-3 navigation destinations only after initial render settles
    const primaryRoutes = [
      ...SHARED_ROUTES,
      ...(ROUTES_BY_ROLE[currentRole] ?? []),
    ];

    timers.current.push(...prefetchBatch(primaryRoutes, router, 3500, 400, 2));

    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, [pathname, router]);

  return null;
}
