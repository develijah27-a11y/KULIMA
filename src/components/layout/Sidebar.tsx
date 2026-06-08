'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, TrendingUp, Cloud, Microscope, Leaf, User,
  ShoppingCart, MessageSquare, Package, Users, Bell, UserCheck, BarChart3,
  ShieldCheck, Wallet, Sprout, Calculator,
} from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  dashboard:    LayoutDashboard,
  marketplace:  ShoppingBag,
  prices:       TrendingUp,
  weather:      Cloud,
  doctor:       Microscope,
  farm:         Leaf,
  profile:      User,
  listings:     ShoppingCart,
  offers:       MessageSquare,
  orders:       Package,
  users:        Users,
  alerts:       Bell,
  buyers:       UserCheck,
  analytics:    BarChart3,
  verify:       ShieldCheck,
  wallet:       Wallet,
  planting:     Sprout,
  finance:      Calculator,
};

export interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

interface SidebarProps {
  navItems: NavItem[];
  profile: { name: string; role: string } | null;
}

export function Sidebar({ navItems, profile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{ background: '#1B4332' }}
    >
      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
          style={{ background: '#52B788', color: '#1B4332' }}
        >
          K
        </div>
        <span className="text-lg font-black text-white" style={{ letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Kulima
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-bold tracking-widest uppercase px-3 mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Menu
        </p>
        {navItems.map(({ href, icon, label, badge }) => {
          const Icon = ICON_MAP[icon] ?? LayoutDashboard;
          const active = pathname === href || (href !== '/farmer/dashboard' && href !== '/buyer/dashboard' && href !== '/admin/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors sidebar-item"
              style={{
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span style={{ fontSize: '14px', fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
              {badge !== undefined && badge > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: '#E63946', color: 'white' }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile card */}
      {profile && (
        <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
              style={{ background: '#40916C' }}
            >
              {profile.name[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">{profile.name}</p>
              <p className="text-[11px] capitalize leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {profile.role}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#52B788' }} title="Online" />
          </div>
        </div>
      )}
    </aside>
  );
}
