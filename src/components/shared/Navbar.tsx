'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Bell, Home, Thermometer, LineChart, Store, Wrench, Cloud, User } from 'lucide-react';

function NavIcon({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 min-h-[52px] min-w-[52px] px-2 rounded-xl transition-colors',
        active
          ? 'text-sprout'
          : 'text-cream/40 hover:text-cream/70'
      )}
      aria-label={label}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span
        className="text-[10px] font-semibold leading-none"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
    </button>
  );
}

const routes: Record<string, string> = {
  '/farmer/dashboard': '/farmer/dashboard',
  '/farmer/weather': '/farmer/weather',
  '/farmer/prices': '/farmer/prices',
  '/farmer/marketplace': '/farmer/marketplace',
  '/farmer/doctor': '/farmer/doctor',
  '/farmer/profile': '/farmer/profile',
};

const navItems = [
  { path: '/farmer/dashboard', icon: Home, label: 'Home' },
  { path: '/farmer/weather', icon: Cloud, label: 'Weather' },
  { path: '/farmer/prices', icon: LineChart, label: 'Prices' },
  { path: '/farmer/marketplace', icon: Store, label: 'Market' },
  { path: '/farmer/doctor', icon: Wrench, label: 'Doctor' },
  { path: '/farmer/profile', icon: User, label: 'Profile' },
] as const;

export function FarmerNav({
  unreadCount,
  notificationsUrl = '/farmer/notifications',
}: {
  unreadCount?: number;
  notificationsUrl?: string;
}) {
  const router = useRouter();
  const [activePath, setActivePath] = useState('/farmer/dashboard');

  useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-surface2 bg-surface/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Farmer navigation"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {navItems.map((item) => (
        <NavIcon
          key={item.path}
          icon={item.icon}
          label={item.label}
          active={activePath === item.path}
          onClick={() => {
            setActivePath(item.path);
            router.push(item.path);
          }}
        />
      ))}
      <button
        onClick={() => router.push(notificationsUrl)}
        className="relative flex flex-col items-center gap-1 min-h-[52px] min-w-[52px] px-2 rounded-xl text-cream/40 hover:text-cream/70 transition-colors"
        aria-label={`Notifications${unreadCount && unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell size={22} strokeWidth={2} />
        {unreadCount && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-clay text-cream text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="text-[10px] font-semibold leading-none">Alerts</span>
      </button>
    </nav>
  );
}
