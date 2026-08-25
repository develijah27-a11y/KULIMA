'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const PUBLIC_ROUTES = [
  '/how-it-works',
  '/about',
  '/news',
  '/premium',
  '/faq',
  '/help',
  '/contact',
  '/auth/signin',
  '/auth/signup',
  '/dashboard',
];

const ROUTES_BY_ROLE: Record<string, string[]> = {
  farmer: [
    '/farmer/dashboard',
    '/farmer/marketplace', '/farmer/marketplace/new',
    '/farmer/orders',
    '/farmer/deliveries', '/farmer/deliveries/new',
    '/farmer/inventory',
    '/farmer/prices',
    '/farmer/listings',
    '/farmer/farm', '/farmer/farm/new',
    '/farmer/farm/workers',
    '/farmer/finance', '/farmer/finance/expenses', '/farmer/finance/calculator',
    '/farmer/planting',
    '/farmer/doctor',
    '/farmer/groups',
    '/farmer/geocluster',
    '/farmer/weather',
    '/farmer/wallet',
    '/farmer/notifications',
    '/farmer/verify',
    '/farmer/profile',
    '/farmer/settings',
  ],
  buyer: [
    '/buyer/dashboard',
    '/buyer/listings',
    '/buyer/requests',
    '/buyer/orders',
    '/buyer/offers',
    '/buyer/contracts',
    '/buyer/deliveries', '/buyer/deliveries/new',
    '/buyer/cold-chain',
    '/buyer/wallet',
    '/buyer/notifications',
    '/buyer/settings',
  ],
  admin: [
    '/admin/dashboard',
    '/admin/users',
    '/admin/verification',
    '/admin/buyers',
    '/admin/disputes',
    '/admin/wallets',
    '/admin/fraud',
    '/admin/prices',
    '/admin/alert',
    '/admin/analytics',
    '/admin/audit-logs',
    '/admin/logs',
  ],
  supplier: [
    '/supplier/dashboard',
    '/supplier/catalogue',
    '/supplier/orders',
    '/supplier/flash-deals',
    '/supplier/demand',
    '/supplier/coverage',
    '/supplier/wallet',
    '/supplier/notifications',
    '/supplier/analytics',
    '/supplier/settings',
  ],
  transporter: [
    '/transporter/dashboard',
    '/transporter/job-queue',
    '/transporter/active',
    '/transporter/deliveries',
    '/transporter/vehicle',
    '/transporter/cold-chain',
    '/transporter/wallet',
    '/transporter/notifications',
    '/transporter/profile',
    '/transporter/settings',
  ],
  pathologist: [
    '/pathologist/dashboard',
    '/pathologist/cases',
    '/pathologist/cases/urgent',
    '/pathologist/cases/mine',
    '/pathologist/cases/resolved',
    '/pathologist/case-queue',
    '/pathologist/geocluster',
    '/pathologist/geo-map',
    '/pathologist/alerts',
    '/pathologist/disease-alerts',
    '/pathologist/my-cases', '/pathologist/my-cases/new',
    '/pathologist/profile',
    '/pathologist/wallet',
    '/pathologist/notifications',
    '/pathologist/settings',
  ],
  offtaker: [
    '/offtaker/dashboard',
    '/offtaker/contracts',
    '/offtaker/pipeline', '/offtaker/pipeline/new',
    '/offtaker/scorecard',
    '/offtaker/spend',
    '/offtaker/quality',
    '/offtaker/risk',
    '/offtaker/messages',
    '/offtaker/invoices',
    '/offtaker/wallet',
    '/offtaker/notifications',
    '/offtaker/settings',
  ],
  groups: [
    '/groups/dashboard',
    '/groups/members', '/groups/members/add',
    '/groups/bulk-orders',
    '/groups/listings', '/groups/listings/create',
    '/groups/wallet',
    '/groups/chat',
    '/groups/season',
    '/groups/finance', '/groups/finance/record',
    '/groups/loans',
    '/groups/announcements',
    '/groups/notifications',
    '/groups/settings',
  ],
};

const SHARED_ROUTES = ['/dashboard'];
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
  initialDelayMs = 50,
  gapMs = 80,
  chunkSize = 4,
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
    // Skip on explicit data-saver mode
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g') return;

    const currentRole = detectRole(pathname);

    // Cancel pending timers from previous route transitions
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // On landing & public marketing pages: immediately warm up all key public routes & auth entry points
    if (!currentRole) {
      timers.current.push(...prefetchBatch(PUBLIC_ROUTES, router, 40, 70, 3));
      return;
    }

    // Skip if role hasn't changed
    if (currentRole === prefetchedRole.current) return;
    prefetchedRole.current = currentRole;

    // Inside a role hub: immediately warm up the primary and top navigation routes for that role
    const primaryRoutes = [
      ...SHARED_ROUTES,
      ...(ROUTES_BY_ROLE[currentRole] ?? []),
    ];

    timers.current.push(...prefetchBatch(primaryRoutes, router, 50, 90, 4));

    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, [pathname, router]);

  return null;
}
