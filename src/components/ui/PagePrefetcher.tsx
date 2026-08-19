'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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

const SHARED_ROUTES = [
  '/dashboard',
];

const ALL_ROLES = Object.keys(ROUTES_BY_ROLE);

function detectRole(pathname: string): string | null {
  for (const role of ALL_ROLES) {
    if (pathname === `/${role}` || pathname.startsWith(`/${role}/`)) return role;
  }
  return null;
}

// requestIdleCallback with a setTimeout fallback for browsers that don't support it
const scheduleIdle: (cb: () => void, timeout?: number) => void =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb, timeout = 6000) => (window as any).requestIdleCallback(cb, { timeout })
    : (cb) => setTimeout(cb, 0);

// Prefetch `routes` in chunks of 6, spaced `gapMs` apart, after `delayMs` initial delay.
// Each chunk is wrapped in requestIdleCallback so we never block user interaction.
function prefetchChunked(
  routes: string[],
  router: { prefetch: (href: string) => void },
  delayMs: number,
  gapMs = 120,
  chunkSize = 6,
): ReturnType<typeof setTimeout>[] {
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (let i = 0; i < routes.length; i += chunkSize) {
    const chunk = routes.slice(i, i + chunkSize);
    const delay = delayMs + (i / chunkSize) * gapMs;
    timers.push(
      setTimeout(
        () => scheduleIdle(() => chunk.forEach(r => { try { router.prefetch(r); } catch { /* ignore */ } })),
        delay,
      ),
    );
  }
  return timers;
}

export function PagePrefetcher() {
  const router  = useRouter();
  const pathname = usePathname();
  const prefetchedRole = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Skip on metered / slow connections
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;

    const currentRole = detectRole(pathname);

    // Skip if role hasn't changed
    if (currentRole === prefetchedRole.current) return;
    prefetchedRole.current = currentRole;

    // Cancel any still-pending timers from the previous role
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // On landing / public pages: only prefetch signin & signup after the initial page has settled
    if (!currentRole) {
      timers.current.push(
        setTimeout(() => {
          scheduleIdle(() => {
            try { router.prefetch('/auth/signin'); } catch {}
            try { router.prefetch('/auth/signup'); } catch {}
          });
        }, 1500)
      );
      return;
    }

    // Inside a specific role (e.g. /farmer): only prefetch top 5 key routes for that active role
    const primaryRoutes = [
      ...SHARED_ROUTES,
      ...(ROUTES_BY_ROLE[currentRole]?.slice(0, 5) ?? []),
    ];

    timers.current.push(...prefetchChunked(primaryRoutes, router, 600, 150, 3));

    return () => { timers.current.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
