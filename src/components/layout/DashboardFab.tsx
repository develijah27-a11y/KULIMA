'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  href: string;
  ariaLabel: string;
  children: ReactNode;
}

// Every role dashboard has one fixed-position floating action button for its
// primary quick action. When that action is itself a chat/messaging page
// (e.g. groups → /groups/chat), the FAB stayed on screen even once you'd
// already navigated there, sitting fixed in the same corner as — and
// visually on top of — that page's own send button. Hiding the FAB whenever
// its target is the page you're already on fixes that for every dashboard,
// not just the one bug report happened to be filed against.
export function DashboardFab({ href, ariaLabel, children }: Props) {
  const pathname = usePathname();
  if (pathname === href || pathname.startsWith(href + '/')) return null;

  return (
    <Link href={href} className="fab fab-primary" aria-label={ariaLabel} style={{ textDecoration: 'none' }}>
      {children}
    </Link>
  );
}
