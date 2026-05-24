'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Cloud, TrendingUp, ShoppingBag, Microscope, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/farmer/dashboard', icon: Home, label: 'Home' },
  { path: '/farmer/weather', icon: Cloud, label: 'Weather' },
  { path: '/farmer/prices', icon: TrendingUp, label: 'Prices' },
  { path: '/farmer/marketplace', icon: ShoppingBag, label: 'Market' },
  { path: '/farmer/doctor', icon: Microscope, label: 'Doctor' },
  { path: '/farmer/profile', icon: User, label: 'Profile' },
] as const;

export function FarmerNav({ unreadCount }: { unreadCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Farmer navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(17,17,17,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = pathname === path || pathname.startsWith(path + '/');
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '12px',
                minWidth: '52px',
                border: 'none',
                background: active ? 'rgba(34,197,94,0.1)' : 'transparent',
                color: active ? 'var(--color-sprout)' : 'rgba(249,250,251,0.35)',
                cursor: 'pointer',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, lineHeight: 1 }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
