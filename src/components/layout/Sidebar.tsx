'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, TrendingUp, Cloud, Microscope, Leaf, User,
  ShoppingCart, MessageSquare, Package, Users, Bell, UserCheck, BarChart3,
  ShieldCheck, Wallet, Sprout, Calculator, Archive, Tag, Globe, Settings,
  Inbox, FileText, Snowflake, BookOpen, Zap, MapPin, ClipboardList,
  Navigation, Thermometer, Stethoscope, AlertCircle, ClipboardCheck,
  CheckSquare, AlertTriangle, GitMerge, Star, PieChart, Shield,
  AlertOctagon, MessageCircle, Receipt, UserPlus, CalendarDays, HardHat,
  Map, Users2, Truck, CheckCircle2, DollarSign, LineChart, LogOut,
} from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export const ICON_MAP: Record<string, IconComponent> = {
  dashboard:        LayoutDashboard,
  marketplace:      ShoppingBag,
  prices:           TrendingUp,
  weather:          Cloud,
  doctor:           Microscope,
  farm:             Leaf,
  profile:          User,
  listings:         ShoppingCart,
  offers:           MessageSquare,
  orders:           Package,
  users:            Users,
  alerts:           Bell,
  notifications:    Bell,
  buyers:           UserCheck,
  analytics:        BarChart3,
  verify:           ShieldCheck,
  wallet:           Wallet,
  planting:         Sprout,
  finance:          Calculator,
  inventory:        Archive,
  'my-listings':    Tag,
  groups:           Users2,
  geocluster:       Globe,
  settings:         Settings,
  workers:          HardHat,
  requests:         Inbox,
  contracts:        FileText,
  'cold-chain':     Snowflake,
  deliveries:       Truck,
  catalogue:        BookOpen,
  'flash-deals':    Zap,
  demand:           LineChart,
  coverage:         MapPin,
  'job-queue':      ClipboardList,
  'active-jobs':    Navigation,
  completed:        CheckCircle2,
  'cold-logs':      Thermometer,
  earnings:         DollarSign,
  'case-queue':     Stethoscope,
  'urgent-cases':   AlertCircle,
  'my-cases':       ClipboardCheck,
  resolved:         CheckSquare,
  'disease-alerts': AlertTriangle,
  'geo-map':        Map,
  pipeline:         GitMerge,
  scorecard:        Star,
  spend:            PieChart,
  quality:          Shield,
  'risk-alerts':    AlertOctagon,
  messages:         MessageCircle,
  invoices:         Receipt,
  members:          UserPlus,
  'group-chat':     MessageSquare,
  season:           CalendarDays,
  dispute:          Shield,
  alert:            AlertOctagon,
  history:          ClipboardList,
};

export interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  divider?: boolean;
  sectionLabel?: string;
}

interface SidebarProps {
  navItems: NavItem[];
  profile: { name: string; role: string } | null;
  roleSwitcher?: React.ReactNode;
}

const DASHBOARD_ROOTS = [
  '/farmer/dashboard', '/buyer/dashboard', '/admin/dashboard',
  '/transporter/dashboard', '/supplier/dashboard', '/pathologist/dashboard',
  '/offtaker/dashboard', '/groups/dashboard',
];

export function Sidebar({ navItems, profile, roleSwitcher }: SidebarProps) {
  const pathname = usePathname();

  const handleSignOut = React.useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.replace('/auth/signin');
  }, []);

  // Precompute active state once per pathname change instead of inside the render loop
  const activeSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const { href } of navItems) {
      if (pathname === href || (!DASHBOARD_ROOTS.includes(href) && href.length > 1 && pathname.startsWith(href + '/'))) {
        set.add(href);
      }
    }
    return set;
  }, [navItems, pathname]);

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto glass-sidebar"
      style={{ width: 220, minWidth: 220 }}
    >
      {/* Logo */}
      <div
        className="px-4 flex items-center gap-2.5 shrink-0"
        style={{
          height: 56,
          borderBottom: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#000',
            fontFamily: 'var(--font-display)',
          }}
        >
          K
        </div>
        <span
          style={{
            fontSize: 16, fontWeight: 800, color: '#000',
            letterSpacing: '-0.02em', fontFamily: 'var(--font-display)',
          }}
        >
          Kulima
        </span>
      </div>

      {roleSwitcher && (
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          {roleSwitcher}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon, label, badge, divider, sectionLabel }, idx) => {
          const Icon = ICON_MAP[icon] ?? LayoutDashboard;
          const active = activeSet.has(href);

          return (
            <div key={href}>
              {divider && (
                <div style={{ marginTop: idx === 0 ? 0 : 10, marginBottom: 6 }}>
                  <div style={{ height: 1, background: 'rgba(0,0,0,0.12)', marginBottom: sectionLabel ? 6 : 0 }} />
                  {sectionLabel && (
                    <p style={{
                      fontSize: 9, fontWeight: 800,
                      color: 'rgba(0,0,0,0.45)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
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
                className="sidebar-item flex items-center gap-2.5 rounded-lg"
                style={{
                  padding: '8px 10px',
                  background: active ? 'rgba(255,255,255,0.28)' : 'transparent',
                  color: active ? '#000000' : 'rgba(0,0,0,0.72)',
                  textDecoration: 'none',
                  minHeight: 40,
                }}
              >
                <span className="shrink-0">
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1, lineHeight: 1.3 }}>
                  {label}
                </span>
                {badge !== undefined && badge > 0 && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 800,
                      padding: '1px 6px', borderRadius: 99,
                      background: 'rgba(0,0,0,0.15)',
                      color: '#000',
                    }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User profile card */}
      {profile && (
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.12)' }}>
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'rgba(255,255,255,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#000',
              }}
            >
              {profile.name[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: 12, fontWeight: 700, color: '#000', lineHeight: 1.3 }} className="truncate">
                {profile.name}
              </p>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.55)', lineHeight: 1.3, textTransform: 'capitalize' }}>
                {profile.role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 flex items-center justify-center rounded-lg transition-colors active:scale-95"
              style={{ width: 28, height: 28, color: 'rgba(0,0,0,0.55)', minHeight: 'unset', minWidth: 'unset' }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
