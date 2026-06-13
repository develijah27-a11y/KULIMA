'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ICON_MAP } from './Sidebar';
import type { NavItem } from './Sidebar';
import { LayoutDashboard } from 'lucide-react';

export function MobileNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  const visibleItems = navItems.slice(0, 5);

  // Precompute active flags once per pathname change
  const activeSet = useMemo(() => {
    const set = new Set<string>();
    for (const { href } of visibleItems) {
      const isDashboardRoot = href.endsWith('/dashboard');
      if (pathname === href || (!isDashboardRoot && href.length > 1 && pathname.startsWith(href + '/'))) {
        set.add(href);
      }
    }
    return set;
  }, [visibleItems, pathname]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex glass-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {visibleItems.map(({ href, icon, label, badge }) => {
        const Icon = ICON_MAP[icon] ?? LayoutDashboard;
        const active = activeSet.has(href);

        return (
          <Link
            key={href}
            href={href}
            className="mobile-nav-item flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{
              color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              minHeight: '52px',
              paddingTop: '8px',
              paddingBottom: '6px',
              position: 'relative',
            }}
          >
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24,
                  height: 2.5,
                  borderRadius: '0 0 3px 3px',
                  background: 'var(--color-primary)',
                }}
              />
            )}
            <div style={{ position: 'relative' }}>
              <Icon size={21} strokeWidth={active ? 2.5 : 1.75} />
              {badge !== undefined && badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    minWidth: 15,
                    height: 15,
                    background: 'var(--color-danger)',
                    color: 'white',
                    borderRadius: 99,
                    fontSize: 9,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, lineHeight: 1 }}>
              {label.split(' ')[0]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
