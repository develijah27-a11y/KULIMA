'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut, LayoutDashboard } from 'lucide-react';
import { ICON_MAP } from './Sidebar';
import type { NavItem } from './Sidebar';

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

  // Close when the user navigates to a new page
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while open
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

  if (!open) return null;

  const initial = profile?.name?.[0]?.toUpperCase() ?? 'U';

  return (
    <div
      className="md:hidden"
      style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex' }}
    >
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'fadeIn 180ms ease',
        }}
      />

      {/* Slide-in drawer */}
      <aside
        style={{
          position: 'relative', zIndex: 1,
          width: 288, maxWidth: '85vw',
          height: '100%',
          display: 'flex', flexDirection: 'column',
          background: 'var(--color-sidebar)',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          animation: 'slideInLeft 220ms cubic-bezier(0.25,0.46,0.45,0.94)',
          boxShadow: '8px 0 40px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 58, padding: '0 16px',
            borderBottom: '1px solid var(--color-sidebar-divider)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900,
              color: 'var(--color-sidebar-text)',
              fontFamily: 'var(--font-display)',
            }}>
              A
            </div>
            <span style={{
              fontSize: 16, fontWeight: 800,
              color: 'var(--color-sidebar-text)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)',
            }}>
              AgriNova
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.10)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-sidebar-muted)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Role label */}
        {profile && (
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-sidebar-divider)',
            flexShrink: 0,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 800,
              color: 'var(--color-sidebar-muted)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {profile.role}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '10px 10px',
            overflowY: 'auto',
          }}
        >
          {navItems.map(({ href, icon, label, badge, divider, sectionLabel }, idx) => {
            const Icon = ICON_MAP[icon] ?? LayoutDashboard;
            const active = activeSet.has(href);

            return (
              <div key={href}>
                {divider && (
                  <div style={{ marginTop: idx === 0 ? 0 : 14, marginBottom: 6 }}>
                    <div style={{
                      height: 1,
                      background: 'var(--color-sidebar-divider)',
                      marginBottom: sectionLabel ? 7 : 0,
                    }} />
                    {sectionLabel && (
                      <p style={{
                        fontSize: 9, fontWeight: 800,
                        color: 'var(--color-sidebar-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                        paddingLeft: 10,
                        fontFamily: 'var(--font-body)',
                      }}>
                        {sectionLabel}
                      </p>
                    )}
                  </div>
                )}
                <Link
                  href={href}
                  prefetch
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: active ? '10px 10px 10px 7px' : '10px 10px',
                    borderRadius: 10,
                    background: active ? 'var(--color-sidebar-active)' : 'transparent',
                    color: active ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-muted)',
                    textDecoration: 'none',
                    marginBottom: 2,
                    minHeight: 46,
                    borderLeft: active ? '3px solid #4ADE80' : '3px solid transparent',
                    transition: 'background 100ms ease, color 100ms ease',
                    position: 'relative',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 700, flex: 1,
                    lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {label}
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      padding: '2px 7px', borderRadius: 99, flexShrink: 0,
                      background: 'var(--color-sidebar-badge)',
                      color: 'var(--color-sidebar-text)',
                    }}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Profile footer */}
        {profile && (
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--color-sidebar-divider)',
            display: 'flex', alignItems: 'center', gap: 12,
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800,
              color: 'var(--color-sidebar-text)',
            }}>
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 700,
                color: 'var(--color-sidebar-text)',
                lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.name}
              </p>
              <p style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--color-sidebar-muted)',
                textTransform: 'capitalize',
              }}>
                {profile.role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,0.10)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-sidebar-muted)',
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
