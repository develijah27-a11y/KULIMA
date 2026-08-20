'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut, LayoutDashboard } from 'lucide-react';
import { ICON_MAP } from './Sidebar';
import type { NavItem } from './Sidebar';
import { useLiveUnreadBadge } from './useLiveUnreadBadge';
import { AppIcon } from '@/components/ui/AppIcon';

interface Props {
  navItems: NavItem[];
  profile: { name: string; role: string } | null;
  roleSwitcher?: React.ReactNode;
}

const DASHBOARD_ROOTS = [
  '/farmer/dashboard', '/buyer/dashboard', '/admin/dashboard',
  '/transporter/dashboard', '/supplier/dashboard', '/pathologist/dashboard',
  '/offtaker/dashboard', '/groups/dashboard',
];

export function MobileSidebarDrawer({ navItems, profile, roleSwitcher }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('cropify:menu-open', handler);
    return () => window.removeEventListener('cropify:menu-open', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    setOpen(false);
    // See Sidebar.tsx's handleSignOut for why: no feedback during a slow
    // logout request read as an unresponsive button, and the timeout
    // means a hung request on a weak connection still lets the user out.
    try {
      await Promise.race([
        fetch('/api/auth/logout', { method: 'POST' }),
        new Promise(resolve => setTimeout(resolve, 4000)),
      ]);
    } finally {
      window.location.replace('/auth/signin');
    }
  }, [signingOut]);

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
    <div className="cropify-drawer-root md:hidden">
      {/* Backdrop */}
      <div
        className="cropify-drawer-backdrop"
        onClick={() => setOpen(false)}
      />

      {/* Slide-in drawer */}
      <aside className="cropify-drawer-panel">

        {/* ── Header ── */}
        <div className="cropify-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AppIcon size={28} rounded={8} />
            <span className="cropify-drawer-logo-text">Cropify</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="cropify-drawer-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Role label / switcher ── */}
        {roleSwitcher ? (
          <div className="cropify-drawer-role" style={{ padding: '8px 12px' }}>
            {roleSwitcher}
          </div>
        ) : profile && (
          <div className="cropify-drawer-role">
            <p className="cropify-drawer-role-text">{profile.role}</p>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className="cropify-drawer-nav">
          {navItems.map(({ href, icon, label, badge, divider, sectionLabel }, idx) => {
            const Icon = ICON_MAP[icon] ?? LayoutDashboard;
            const active = activeSet.has(href);
            const badgeValue = icon === 'notifications' ? liveUnread : badge;

            return (
              <div key={href}>
                {divider && (
                  <div className="cropify-drawer-section-wrap" style={{ marginTop: idx === 0 ? 0 : undefined }}>
                    <div className="cropify-drawer-divider" />
                    {sectionLabel && (
                      <p className="cropify-drawer-section-label">{sectionLabel}</p>
                    )}
                  </div>
                )}
                <Link
                  href={href}
                  prefetch
                  className={`cropify-drawer-link${active ? ' cropify-drawer-link--active' : ''}`}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  </span>
                  <span className="cropify-drawer-link-label">{label}</span>
                  {badgeValue !== undefined && badgeValue > 0 && (
                    <span className="cropify-drawer-badge">
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
          <div className="cropify-drawer-footer">
            <div className="cropify-drawer-avatar">{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="cropify-drawer-name">{profile.name}</p>
              <p className="cropify-drawer-role-sub">{profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign out"
              className="cropify-drawer-signout"
              style={{ opacity: signingOut ? 0.5 : 1 }}
            >
              <LogOut size={15} className={signingOut ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
