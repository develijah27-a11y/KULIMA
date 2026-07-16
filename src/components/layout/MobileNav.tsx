'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ICON_MAP } from './Sidebar';
import type { NavItem } from './Sidebar';
import { LayoutDashboard, MoreHorizontal } from 'lucide-react';
import { useLiveUnreadBadge } from './useLiveUnreadBadge';

// Show 4 primary items in the tab bar; "More" opens the full MobileSidebarDrawer.
const MAX_PRIMARY = 4;

export function MobileNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  const visibleItems = navItems.slice(0, MAX_PRIMARY);
  const overflowItems = navItems.slice(MAX_PRIMARY);
  const hasOverflow = overflowItems.length > 0;

  const notifItem = navItems.find(i => i.icon === 'notifications');
  const liveUnread = useLiveUnreadBadge(notifItem?.badge);

  const overflowBadgeTotal = overflowItems.reduce((sum, i) => sum + (i.icon === 'notifications' ? liveUnread : (i.badge ?? 0)), 0);

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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex glass-nav mobile-tab-bar"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
      {visibleItems.map(({ href, icon, label, badge }) => {
        const Icon = ICON_MAP[icon] ?? LayoutDashboard;
        const active = activeSet.has(href);
        const badgeValue = icon === 'notifications' ? liveUnread : badge;

        return (
          <Link
            key={href}
            href={href}
            prefetch
            className="mobile-nav-item flex-1 flex flex-col items-center justify-center"
            style={{
              color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              position: 'relative',
              gap: 'clamp(2px, 0.8vw, 4px)',
              paddingTop: 'clamp(6px, 1.5vh, 9px)',
              paddingBottom: 'clamp(5px, 1.2vh, 7px)',
              minHeight: 'clamp(50px, 8vh, 60px)',
            }}
          >
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 'clamp(20px, 6vw, 28px)',
                  height: 3,
                  borderRadius: '0 0 4px 4px',
                  background: 'var(--color-primary)',
                  boxShadow: '0 1px 6px var(--color-primary)',
                }}
              />
            )}
            <div style={{ position: 'relative' }}>
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                style={{ display: 'block' }}
              />
              {badgeValue !== undefined && badgeValue > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -7,
                    minWidth: 16,
                    height: 16,
                    background: 'var(--color-danger)',
                    color: 'white',
                    borderRadius: 99,
                    fontSize: 9,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '1.5px solid var(--color-bg)',
                    letterSpacing: 0,
                  }}
                >
                  {badgeValue > 9 ? '9+' : badgeValue}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 'clamp(9px, 2.4vw, 10.5px)',
                fontWeight: active ? 700 : 500,
                lineHeight: 1,
                letterSpacing: active ? '-0.01em' : 0,
              }}
            >
              {label.split(' ')[0]}
            </span>
          </Link>
        );
      })}
      {hasOverflow && (
        <button
          onClick={openSidebar}
          aria-label="Open full menu"
          className="mobile-nav-item flex-1 flex flex-col items-center justify-center no-min-touch"
          style={{
            color: overflowActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            gap: 'clamp(2px, 0.8vw, 4px)',
            paddingTop: 'clamp(6px, 1.5vh, 9px)',
            paddingBottom: 'clamp(5px, 1.2vh, 7px)',
            minHeight: 'clamp(50px, 8vh, 60px)',
          }}
        >
          {overflowActive && (
            <span
              style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 'clamp(20px, 6vw, 28px)', height: 3,
                borderRadius: '0 0 4px 4px', background: 'var(--color-primary)',
                boxShadow: '0 1px 6px var(--color-primary)',
              }}
            />
          )}
          <div style={{ position: 'relative' }}>
            <MoreHorizontal size={22} strokeWidth={overflowActive ? 2.5 : 1.8} style={{ display: 'block' }} />
            {overflowBadgeTotal > 0 && (
              <span
                style={{
                  position: 'absolute', top: -5, right: -7, minWidth: 16, height: 16,
                  background: 'var(--color-danger)', color: 'white', borderRadius: 99,
                  fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 4px',
                  border: '1.5px solid var(--color-bg)',
                }}
              >
                {overflowBadgeTotal > 9 ? '9+' : overflowBadgeTotal}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 'clamp(9px, 2.4vw, 10.5px)',
            fontWeight: overflowActive ? 700 : 500,
            lineHeight: 1,
          }}>
            More
          </span>
        </button>
      )}
      </nav>
    </>
  );
}
