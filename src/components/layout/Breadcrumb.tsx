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
  supplier: 'Supplier',
  transporter: 'Transporter',
  pathologist: 'Pathologist',
  offtaker: 'Offtaker',
  groups: 'Groups',
  // Common segments
  dashboard: 'Dashboard',
  marketplace: 'Marketplace',
  orders: 'Orders',
  listings: 'Listings',
  inventory: 'Inventory',
  prices: 'Prices',
  weather: 'Weather',
  doctor: 'Crop Doctor',
  farm: 'My Farm',
  workers: 'Workers',
  deliveries: 'Deliveries',
  requests: 'Requests',
  contracts: 'Contracts',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  wallet: 'Wallet',
  planting: 'Planting',
  analytics: 'Analytics',
  'flash-deals': 'Flash Deals',
  catalogue: 'Catalogue',
  'cold-chain': 'Cold Chain',
  earnings: 'Earnings',
  vehicle: 'My Fleet',
  'job-queue': 'Job Queue',
  active: 'Active Jobs',
  'case-queue': 'Case Queue',
  consultations: 'Consultations',
  chat: 'Chat',
  invoices: 'Invoices',
  'group-chat': 'Group Chat',
  members: 'Members',
  favourites: 'Favourites',
  'audit-logs': 'Audit Logs',
  commission: 'Commission',
  users: 'Users',
  verify: 'Verification',
  'bulk-orders': 'Bulk Orders',
  pipeline: 'Pipeline',
  geocluster: 'Geo Clusters',
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
