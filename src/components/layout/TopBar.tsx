'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { OfflineStatusPill } from '@/components/ui/OfflineStatusPill';

interface TopBarProps {
  greeting: string;
  location?: string;
  unreadCount?: number;
  notificationsHref?: string;
}

export function TopBar({ greeting, location, unreadCount = 0, notificationsHref }: TopBarProps) {
  const shortGreeting = greeting.replace(/^Good (morning|afternoon|evening), /, '');

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between shrink-0"
      style={{
        height: '56px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
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
