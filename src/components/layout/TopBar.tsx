'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { OfflineStatusPill } from '@/components/ui/OfflineStatusPill';
import { ROLE_META } from '@/components/layout/RoleSwitcher';

interface TopBarProps {
  greeting: string;
  location?: string;
  unreadCount?: number;
  notificationsHref?: string;
  currentRole?: string;
  allRoles?: string[];
}

export function TopBar({
  greeting,
  location,
  unreadCount = 0,
  notificationsHref,
  currentRole,
  allRoles,
}: TopBarProps) {
  const shortGreeting = greeting.replace(/^Good (morning|afternoon|evening), /, '');
  const router = useRouter();
  const [roleOpen, setRoleOpen] = useState(false);

  const currentMeta = currentRole ? ROLE_META[currentRole] : null;
  const otherRoles = (allRoles ?? []).filter(r => r !== currentRole && ROLE_META[r]);
  const showRoleSwitch = !!(currentMeta && otherRoles.length > 0);

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between shrink-0 glass-topbar"
      style={{
        height: '56px',
        paddingLeft: 'clamp(12px, 4vw, 24px)',
        paddingRight: 'clamp(12px, 4vw, 24px)',
      }}
    >
      {/* Greeting */}
      <div className="min-w-0 flex-1 mr-3">
        <p
          className="font-bold truncate hidden sm:block"
          style={{ fontSize: '14px', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
        >
          {greeting}
        </p>
        <p
          className="font-bold truncate sm:hidden"
          style={{ fontSize: '14px', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
        >
          {shortGreeting}
        </p>
        {location && (
          <p className="text-xs mt-0.5 truncate hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
            📍 {location}, Uganda
          </p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:block">
          <OfflineStatusPill />
        </div>

        <ThemeToggle />

        {/* Mobile role-switcher — hidden on desktop (sidebar handles it there) */}
        {showRoleSwitch && (
          <div className="md:hidden" style={{ position: 'relative' }}>
            <button
              className="topbar-btn no-min-touch flex items-center rounded-lg"
              onClick={() => setRoleOpen(v => !v)}
              aria-label="Switch role"
              aria-expanded={roleOpen}
              style={{
                height: 36,
                padding: '0 10px',
                gap: 6,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-mid)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ fontSize: 15 }}>{currentMeta!.icon}</span>
              <ChevronDown
                size={11}
                style={{
                  color: 'var(--color-text-muted)',
                  transform: roleOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s',
                }}
              />
            </button>

            {roleOpen && (
              <>
                {/* Backdrop — closes the dropdown */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setRoleOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: 168,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-mid)',
                    borderRadius: 12,
                    padding: 6,
                    zIndex: 50,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.10)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.10em',
                      padding: '4px 8px 6px',
                    }}
                  >
                    Switch role
                  </p>
                  {otherRoles.map(role => {
                    const meta = ROLE_META[role];
                    return (
                      <button
                        key={role}
                        className="no-min-touch"
                        onClick={() => { setRoleOpen(false); router.push(meta.href); }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 16 }}>{meta.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {notificationsHref ? (
          <Link
            href={notificationsHref}
            className="topbar-btn relative flex items-center justify-center rounded-lg"
            style={{
              width: 36, height: 36,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-mid)',
            }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={17} style={{ color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-black text-white"
                style={{ width: 16, height: 16, fontSize: 9, background: 'var(--color-danger)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ) : (
          <div
            className="relative flex items-center justify-center rounded-lg"
            style={{
              width: 36, height: 36,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-mid)',
            }}
          >
            <Bell size={17} style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}
      </div>
    </header>
  );
}
