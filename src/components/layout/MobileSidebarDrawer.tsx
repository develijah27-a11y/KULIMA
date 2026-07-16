'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut, LayoutDashboard } from 'lucide-react';
import { ICON_MAP } from './Sidebar';
import type { NavItem } from './Sidebar';
import { useLiveUnreadBadge } from './useLiveUnreadBadge';

interface Props {
  navItems: NavItem[];
  profile: { name: string; role: string } | null;
}

const DASHBOARD_ROOTS = [
  '/farmer/dashboard', '/buyer/dashboard', '/admin/dashboard',
  '/transporter/dashboard', '/supplier/dashboard', '/pathologist/dashboard',
  '/offtaker/dashboard', '/groups/dashboard',
];

export function MobileSidebarDrawer({ navItems, profile }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('agrinova:menu-open', handler);
    return () => window.removeEventListener('agrinova:menu-open', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.replace('/auth/signin');
  }, []);

  const activeSet = useMemo(() => {
    const set = new Set<string>();
    for (const { href } of navItems) {
      const isDashboard = DASHBOARD_ROOTS.includes(href);
      if (pathname === href || (!isDashboard && href.length > 1 && pathname.startsWith(href + '/'))) {
        set.add(href);
      }
    }
    return set;
  }, [navItems, pathname]);

  const notifItem = navItems.find(i => i.icon === 'notifications');
  const liveUnread = useLiveUnreadBadge(notifItem?.badge);

  if (!open) return null;

  const initial = profile?.name?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="agrinova-drawer-root md:hidden">
      {/* Backdrop */}
      <div
        className="agrinova-drawer-backdrop"
        onClick={() => setOpen(false)}
      />

      {/* Slide-in drawer */}
      <aside className="agrinova-drawer-panel">

        {/* ── Header ── */}
        <div className="agrinova-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="agrinova-drawer-logo-mark">A</div>
            <span className="agrinova-drawer-logo-text">AgriNova</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="agrinova-drawer-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Role label ── */}
        {profile && (
          <div className="agrinova-drawer-role">
            <p className="agrinova-drawer-role-text">{profile.role}</p>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className="agrinova-drawer-nav">
          {navItems.map(({ href, icon, label, badge, divider, sectionLabel }, idx) => {
            const Icon = ICON_MAP[icon] ?? LayoutDashboard;
            const active = activeSet.has(href);
            const badgeValue = icon === 'notifications' ? liveUnread : badge;

            return (
              <div key={href}>
                {divider && (
                  <div className="agrinova-drawer-section-wrap" style={{ marginTop: idx === 0 ? 0 : undefined }}>
                    <div className="agrinova-drawer-divider" />
                    {sectionLabel && (
                      <p className="agrinova-drawer-section-label">{sectionLabel}</p>
                    )}
                  </div>
                )}
                <Link
                  href={href}
                  prefetch
                  className={`agrinova-drawer-link${active ? ' agrinova-drawer-link--active' : ''}`}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  </span>
                  <span className="agrinova-drawer-link-label">{label}</span>
                  {badgeValue !== undefined && badgeValue > 0 && (
                    <span className="agrinova-drawer-badge">
                      {badgeValue > 99 ? '99+' : badgeValue}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* ── Profile footer ── */}
        {profile && (
          <div className="agrinova-drawer-footer">
            <div className="agrinova-drawer-avatar">{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="agrinova-drawer-name">{profile.name}</p>
              <p className="agrinova-drawer-role-sub">{profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="agrinova-drawer-signout"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
