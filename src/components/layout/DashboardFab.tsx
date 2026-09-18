'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  href: string;
  ariaLabel: string;
  children: ReactNode;
}

const SUPPRESSED_PATTERNS = [
  '/assistant',
  '/chat',
  '/messages',
  '/direct',
  '/support',
  '/new',
  '/edit',
  '/active',
  '/deliveries',
  '/tracking',
  '/map',
  '/job-queue',
];

export function DashboardFab({ href, ariaLabel, children }: Props) {
  const pathname = usePathname();

  // Hide the FAB whenever on the destination page, or on any chat/assistant/messaging/form page
  // where a floating button would obstruct the bottom Send button or action controls.
  if (
    pathname === href ||
    pathname.startsWith(href + '/') ||
    SUPPRESSED_PATTERNS.some((p) => pathname.includes(p))
  ) {
    return null;
  }

  return (
    <Link href={href} className="fab fab-primary" aria-label={ariaLabel} style={{ textDecoration: 'none' }}>
      {children}
    </Link>
  );
}
