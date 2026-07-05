'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ICON_MAP } from './Sidebar';
import type { NavItem } from './Sidebar';
import { LayoutDashboard, MoreHorizontal } from 'lucide-react';

// Show 4 primary items in the tab bar; "More" opens the full MobileSidebarDrawer.
const MAX_PRIMARY = 4;

export function MobileNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  const visibleItems = navItems.slice(0, MAX_PRIMARY);
  const overflowItems = navItems.slice(MAX_PRIMARY);
  const overflowBadgeTotal = overflowItems.reduce((sum, i) => sum + (i.badge ?? 0), 0);
  const hasOverflow = overflowItems.length > 0;

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

  const overflowActive = useMemo(
    () => overflowItems.some(({ href }) => pathname === href || (href.length > 1 && pathname.startsWith(href + '/'))),
    [overflowItems, pathname]
  );

  const openSidebar = useCallback(() => {
    window.dispatchEvent(new CustomEvent('agrinova:menu-open'));
  }, []);

  return (
    <>

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
            prefetch
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
      {hasOverflow && (
        <button
          onClick={openSidebar}
          aria-label="Open full menu"
          className="mobile-nav-item flex-1 flex flex-col items-center justify-center gap-0.5"
          style={{
            color: overflowActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            minHeight: '52px',
            paddingTop: '8px',
            paddingBottom: '6px',
            position: 'relative',
          }}
        >
          {overflowActive && (
            <span
              style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2.5, borderRadius: '0 0 3px 3px', background: 'var(--color-primary)',
              }}
            />
          )}
          <div style={{ position: 'relative' }}>
            <MoreHorizontal size={21} strokeWidth={overflowActive ? 2.5 : 1.75} />
            {overflowBadgeTotal > 0 && (
              <span
                style={{
                  position: 'absolute', top: -4, right: -6, minWidth: 15, height: 15,
                  background: 'var(--color-danger)', color: 'white', borderRadius: 99,
                  fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 3px',
                }}
              >
                {overflowBadgeTotal > 9 ? '9+' : overflowBadgeTotal}
              </span>
            )}
          </div>
          <span style={{ fontSize: '10px', fontWeight: overflowActive ? 700 : 500, lineHeight: 1 }}>More</span>
        </button>
      )}
      </nav>
    </>
  );
}
