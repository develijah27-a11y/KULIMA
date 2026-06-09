'use client';

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
  Map, Users2, Truck, CheckCircle2, DollarSign, LineChart,
} from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export const ICON_MAP: Record<string, IconComponent> = {
  // shared
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
  // farmer-specific
  inventory:        Archive,
  'my-listings':    Tag,
  groups:           Users2,
  geocluster:       Globe,
  settings:         Settings,
  workers:          HardHat,
  // buyer
  requests:         Inbox,
  contracts:        FileText,
  'cold-chain':     Snowflake,
  deliveries:       Truck,
  // supplier
  catalogue:        BookOpen,
  'flash-deals':    Zap,
  demand:           LineChart,
  coverage:         MapPin,
  // transporter
  'job-queue':      ClipboardList,
  'active-jobs':    Navigation,
  completed:        CheckCircle2,
  'cold-logs':      Thermometer,
  earnings:         DollarSign,
  // pathologist
  'case-queue':     Stethoscope,
  'urgent-cases':   AlertCircle,
  'my-cases':       ClipboardCheck,
  resolved:         CheckSquare,
  'disease-alerts': AlertTriangle,
  'geo-map':        Map,
  // offtaker
  pipeline:         GitMerge,
  scorecard:        Star,
  spend:            PieChart,
  quality:          Shield,
  'risk-alerts':    AlertOctagon,
  messages:         MessageCircle,
  invoices:         Receipt,
  // farmer group
  members:          UserPlus,
  'group-chat':     MessageSquare,
  season:           CalendarDays,
  // admin extras
  dispute:          Shield,
  alert:            AlertOctagon,
  history:          ClipboardList,
};

export interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  divider?: boolean;      // renders a section separator above this item
  sectionLabel?: string;  // optional label for the section
}

interface SidebarProps {
  navItems: NavItem[];
  profile: { name: string; role: string } | null;
  roleSwitcher?: React.ReactNode;
}

export function Sidebar({ navItems, profile, roleSwitcher }: SidebarProps) {
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

      {/* Optional role switcher */}
      {roleSwitcher && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {roleSwitcher}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon, label, badge, divider, sectionLabel }, idx) => {
          const Icon = ICON_MAP[icon] ?? LayoutDashboard;
          const active = pathname === href || (href !== '/farmer/dashboard' && href !== '/buyer/dashboard' && href !== '/admin/dashboard' && href !== '/transporter/dashboard' && href !== '/supplier/dashboard' && href !== '/pathologist/dashboard' && href !== '/offtaker/dashboard' && href !== '/groups/dashboard' && pathname.startsWith(href));

          return (
            <div key={href}>
              {/* Section divider */}
              {divider && (
                <div style={{ marginTop: idx === 0 ? 0 : 12, marginBottom: 8 }}>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: sectionLabel ? 8 : 0 }} />
                  {sectionLabel && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: 12 }}>
                      {sectionLabel}
                    </p>
                  )}
                </div>
              )}
              <Link
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
