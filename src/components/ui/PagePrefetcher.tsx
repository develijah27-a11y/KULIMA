'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// All navigable pages in the app — prefetched silently after first paint.
// Grouped by role so we can prioritise the current user's routes first.
const ALL_ROUTES = [
  // Core auth
  '/auth/signin', '/auth/signup',
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
    // Wait 1.5 s so the current page finishes rendering before we hit the network.
    const timer = setTimeout(() => {
      ALL_ROUTES.forEach((route, i) => {
        // Space prefetches 80 ms apart — smooth, doesn't saturate the connection.
        setTimeout(() => {
          try { router.prefetch(route); } catch { /* ignore */ }
        }, i * 80);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
