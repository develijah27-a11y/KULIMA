'use client';

import { Bell } from 'lucide-react';

interface TopBarProps {
  greeting: string;
  location?: string;
  unreadCount?: number;
}

export function TopBar({ greeting, location, unreadCount = 0 }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 shrink-0"
      style={{
        height: '64px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <div>
        <p className="text-sm font-bold" style={{ color: '#1A1A1A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {greeting}
        </p>
        {location && (
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            📍 {location}, Uganda
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Language selector */}
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: '#F8FAF9', color: '#6B7280', border: '1px solid #E5E7EB' }}
        >
          EN ▾
        </button>

        {/* Notification bell */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-lg"
          style={{ background: '#F8FAF9', border: '1px solid #E5E7EB' }}
          aria-label="Notifications"
        >
          <Bell size={18} style={{ color: '#6B7280' }} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-black text-white"
              style={{ background: '#E63946' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
