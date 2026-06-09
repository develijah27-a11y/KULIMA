'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';

interface TopBarProps {
  greeting: string;
  location?: string;
  unreadCount?: number;
  notificationsHref?: string;
}

export function TopBar({ greeting, location, unreadCount = 0, notificationsHref }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 shrink-0"
      style={{
        height: '64px',
        background: 'var(--d-card)',
        borderBottom: '1px solid var(--d-border)',
      }}
    >
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--d-text)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {greeting}
        </p>
        {location && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--d-muted)' }}>
            📍 {location}, Uganda
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Language selector */}
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--d-subtle)', color: 'var(--d-muted)', border: '1px solid var(--d-border)' }}
        >
          EN ▾
        </button>

        {/* Notification bell */}
        {notificationsHref ? (
          <Link
            href={notificationsHref}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--d-subtle)', border: '1px solid var(--d-border)' }}
            aria-label="Notifications"
          >
            <Bell size={18} style={{ color: unreadCount > 0 ? '#1B4332' : 'var(--d-muted)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-black text-white"
                style={{ background: '#E63946' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ) : (
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--d-subtle)', border: '1px solid var(--d-border)' }}
            aria-label="Notifications"
          >
            <Bell size={18} style={{ color: 'var(--d-muted)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-black text-white"
                style={{ background: '#E63946' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
