'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import React from 'react';

const SEGMENT_LABELS: Record<string, string> = {
  // Roles
  farmer: 'Farmer',
  buyer: 'Buyer',
  admin: 'Admin',
  supplier: 'Agro-dealer',
  transporter: 'Transporter',
  pathologist: 'Crop Doctor',
  offtaker: 'Bulk Buyer',
  groups: 'Groups',
  // Common segments
  dashboard: 'Dashboard',
  marketplace: 'Market',
  orders: 'My Orders',
  listings: 'My Produce',
  inventory: 'Inventory',
  prices: 'Market Prices',
  weather: 'Weather',
  doctor: 'Crop Doctor',
  farm: 'My Farm',
  workers: 'Workers',
  deliveries: 'Deliveries',
  requests: 'Requests',
  contracts: 'Agreements',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  wallet: 'Wallet',
  planting: 'Planting',
  analytics: 'Reports',
  'flash-deals': 'Quick Deals',
  catalogue: 'Products',
  'cold-chain': 'Cool Transport',
  earnings: 'Earnings',
  vehicle: 'My Fleet',
  'job-queue': 'Available Jobs',
  active: 'Active Jobs',
  'case-queue': 'New Cases',
  consultations: 'Farmer Requests',
  chat: 'Chat',
  invoices: 'Payment Requests',
  'group-chat': 'Group Chat',
  members: 'Members',
  favourites: 'Saved Items',
  'audit-logs': 'Audit Logs',
  commission: 'Commission',
  users: 'Users',
  verify: 'Get Verified',
  'bulk-orders': 'Bulk Orders',
  pipeline: 'My Suppliers',
  geocluster: 'Farmers Near Me',
};

function formatSegment(seg: string): string {
  return SEGMENT_LABELS[seg]
    ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function Breadcrumb() {
  const pathname = usePathname();

  // Only show breadcrumb when we're deeper than the role dashboard
  const segments = pathname.split('/').filter(Boolean);

  // Hide on dashboard root pages (e.g. /farmer/dashboard)
  if (segments.length <= 2 && segments[1] === 'dashboard') return null;
  // Hide on single-segment pages (e.g. /farmer)
  if (segments.length <= 1) return null;

  const crumbs: { label: string; href: string }[] = [];
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    crumbs.push({ label: formatSegment(seg), href: acc });
  }

  // Replace first segment (role) with a home icon
  const [role, ...rest] = crumbs;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
    >
      <Link
        href={role.href + '/dashboard'}
        style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-hint)', textDecoration: 'none' }}
        title={role.label}
      >
        <Home size={11} />
      </Link>
      {rest.map((crumb, i) => {
        const isLast = i === rest.length - 1;
        return (
          <React.Fragment key={crumb.href}>
            <ChevronRight size={10} style={{ color: 'var(--color-text-hint)', flexShrink: 0 }} />
            {isLast ? (
              <span
                style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  maxWidth: 120, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--color-text-hint)',
                  textDecoration: 'none',
                  maxWidth: 100, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
