'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ALL_ROUTES = [
  // Farmer
  '/farmer/dashboard', '/farmer/listings', '/farmer/marketplace',
  '/farmer/wallet', '/farmer/disease-detection', '/farmer/alerts',
  '/farmer/profile', '/farmer/verify', '/farmer/settings',
  // Buyer
  '/buyer/dashboard', '/buyer/browse', '/buyer/orders',
  '/buyer/wallet', '/buyer/settings',
  // Supplier
  '/supplier/dashboard', '/supplier/products', '/supplier/orders',
  '/supplier/catalogue', '/supplier/settings',
  // Transporter
  '/transporter/dashboard', '/transporter/jobs',
  '/transporter/my-rides', '/transporter/earnings', '/transporter/settings',
  // Pathologist
  '/pathologist/dashboard', '/pathologist/case-queue',
  '/pathologist/my-cases', '/pathologist/geo-map', '/pathologist/settings',
  // Offtaker
  '/offtaker/dashboard', '/offtaker/contracts',
  '/offtaker/scorecards', '/offtaker/settings',
  // Groups
  '/groups/dashboard', '/groups/members', '/groups/finance',
  '/groups/loans', '/groups/listings', '/groups/announcements', '/groups/settings',
  // Admin
  '/admin/dashboard', '/admin/users', '/admin/settings',
];

export function PagePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Phase 1 — browser-level <link rel="prefetch"> hints fired immediately.
    // These queue low-priority fetches of the HTML for each route so the
    // browser has them ready before the user even hovers.
    const injected: HTMLLinkElement[] = [];
    ALL_ROUTES.forEach(route => {
      const el = document.createElement('link');
      el.rel = 'prefetch';
      el.href = route;
      el.as = 'document';
      document.head.appendChild(el);
      injected.push(el);
    });

    // Phase 2 — Next.js router.prefetch() downloads the JS chunks + RSC payload
    // for each route so clicking any link is instant (no network wait).
    // Staggered 60 ms apart to avoid saturating the connection on page load.
    const timers: ReturnType<typeof setTimeout>[] = [];
    ALL_ROUTES.forEach((route, i) => {
      const t = setTimeout(() => {
        try { router.prefetch(route); } catch { /* ignore */ }
      }, 800 + i * 60);          // start at 800 ms, done in ~3 s total
      timers.push(t);
    });

    return () => {
      timers.forEach(clearTimeout);
      injected.forEach(el => el.parentNode?.removeChild(el));
    };
  }, [router]);

  return null;
}
