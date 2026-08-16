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
  Map, Users2, Truck, CheckCircle2, DollarSign, LineChart, LogOut, Bookmark,
  ChevronLeft, ChevronRight, Activity, Headphones, Crown, Sparkles, Newspaper,
} from 'lucide-react';
import { useLiveUnreadBadge } from './useLiveUnreadBadge';
import { AppIcon } from '@/components/ui/AppIcon';
import { Wordmark } from '@/components/ui/Wordmark';

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

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
  pos:              ShoppingCart,
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
  favourites:       Bookmark,
  consultations:    CalendarDays,
  chat:             MessageCircle,
  'bulk-orders':    Package,
  risk:             AlertOctagon,
  active:           Navigation,
  vehicle:          Truck,
  'audit-logs':     ClipboardList,
  verification:     ShieldCheck,
  fraud:            AlertOctagon,
  'system-logs':    Activity,
  support:          Headphones,
  premium:          Crown,
  assistant:        Sparkles,
  news:             Newspaper,
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

const COLLAPSED_KEY = 'cropify-sidebar-collapsed';

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
}

export function Sidebar({ navItems, profile, roleSwitcher }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(getInitialCollapsed());
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const handleSignOut = React.useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.replace('/auth/signin');
  }, []);

  const activeSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const { href } of navItems) {
      if (pathname === href || (!DASHBOARD_ROOTS.includes(href) && href.length > 1 && pathname.startsWith(href + '/'))) {
        set.add(href);
      }
    }
    return set;
  }, [navItems, pathname]);

  const width = collapsed ? 56 : 220;

  const notifItem = navItems.find(i => i.icon === 'notifications');
  const liveUnread = useLiveUnreadBadge(notifItem?.badge);

  return (
    <aside
      className="glass-sidebar hidden md:flex flex-col shrink-0 h-screen sticky top-0"
      style={{
        width,
        minWidth: width,
        overflowX: 'hidden',
        overflowY: 'auto',
        transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1), min-width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 56,
          borderBottom: '1px solid var(--color-sidebar-divider)',
          padding: collapsed ? '0 14px' : '0 16px',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <AppIcon size={28} rounded={8} />
        {!collapsed && (
          <Wordmark
            color="var(--color-sidebar-text)"
            style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden' }}
          />
        )}
      </div>

      {roleSwitcher && !collapsed && (
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--color-sidebar-divider)' }}>
          {roleSwitcher}
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 py-3 space-y-0.5 overflow-y-auto"
        style={{ padding: collapsed ? '12px 6px' : '12px 10px' }}
      >
        {navItems.map(({ href, icon, label, badge, divider, sectionLabel }, idx) => {
          const Icon = ICON_MAP[icon] ?? LayoutDashboard;
          const active = activeSet.has(href);
          const badgeValue = icon === 'notifications' ? liveUnread : badge;

          return (
            <div key={href}>
              {divider && !collapsed && (
                <div style={{ marginTop: idx === 0 ? 0 : 10, marginBottom: 6 }}>
                  <div style={{ height: 1, background: 'var(--color-sidebar-divider)', marginBottom: sectionLabel ? 6 : 0 }} />
                  {sectionLabel && (
                    <p style={{
                      fontSize: 9, fontWeight: 800,
                      color: 'var(--color-sidebar-muted)',
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
              {divider && collapsed && idx !== 0 && (
                <div style={{ height: 1, background: 'var(--color-sidebar-divider)', margin: '8px 4px' }} />
              )}
              <Link
                href={href}
                prefetch
                className="sidebar-item flex items-center rounded-lg"
                title={collapsed ? label : undefined}
                style={{
                  padding: collapsed ? '10px 0' : '8px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 10,
                  background: active ? 'var(--color-sidebar-active)' : 'transparent',
                  color: active ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-muted)',
                  textDecoration: 'none',
                  minHeight: 40,
                  borderLeft: active && !collapsed ? '3px solid #4ADE80' : '3px solid transparent',
                  paddingLeft: active && !collapsed ? 7 : (collapsed ? 0 : 10),
                }}
              >
                <span className="shrink-0">
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                </span>
                {!collapsed && (
                  <span style={{ fontSize: 13, fontWeight: 700, flex: 1, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {label}
                  </span>
                )}
                {!collapsed && badgeValue !== undefined && badgeValue > 0 && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 800,
                      padding: '1px 6px', borderRadius: 99,
                      background: 'var(--color-sidebar-badge)',
                      color: 'var(--color-sidebar-text)',
                    }}
                  >
                    {badgeValue > 99 ? '99+' : badgeValue}
                  </span>
                )}
                {collapsed && badgeValue !== undefined && badgeValue > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6, right: 6,
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-danger)',
                    }}
                  />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User profile card */}
      {profile && !collapsed && (
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--color-sidebar-divider)' }}>
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'rgba(255,255,255,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: 'var(--color-sidebar-text)',
              }}
            >
              {profile.name[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sidebar-text)', lineHeight: 1.3 }} className="truncate">
                {profile.name}
              </p>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-sidebar-muted)', lineHeight: 1.3, textTransform: 'capitalize' }}>
                {profile.role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 flex items-center justify-center rounded-lg transition-colors active:scale-95"
              style={{ width: 28, height: 28, color: 'var(--color-sidebar-muted)', minHeight: 'unset', minWidth: 'unset' }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Collapsed avatar + signout */}
      {profile && collapsed && (
        <div
          className="flex flex-col items-center gap-2 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-sidebar-divider)' }}
        >
          <div
            title={profile.name}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: 'var(--color-sidebar-text)',
            }}
          >
            {profile.name[0]?.toUpperCase() ?? 'U'}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center justify-center rounded-lg active:scale-95"
            style={{ width: 28, height: 28, color: 'var(--color-sidebar-muted)', minHeight: 'unset', minWidth: 'unset' }}
          >
            <LogOut size={13} />
          </button>
        </div>
      )}

      {/* Collapse toggle button */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="no-min-touch shrink-0 flex items-center justify-center"
        style={{
          height: 36,
          width: '100%',
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          borderTop: '1px solid var(--color-sidebar-divider)',
          color: 'var(--color-sidebar-muted)',
          cursor: 'pointer',
          transition: 'background 80ms ease',
          minHeight: 'unset',
          minWidth: 'unset',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.11)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
      >
        {collapsed
          ? <ChevronRight size={13} />
          : <ChevronLeft size={13} />
        }
      </button>
    </aside>
  );
}
