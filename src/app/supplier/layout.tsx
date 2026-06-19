import Link from 'next/link';
import { Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';

const SUPPLIER_NAV = [
  { href: '/supplier/dashboard',   icon: 'dashboard',    label: 'Dashboard' },
  // ── Products
  { href: '/supplier/catalogue',   icon: 'catalogue',    label: 'My Catalogue',  divider: true, sectionLabel: 'Products' },
  { href: '/supplier/orders',      icon: 'orders',       label: 'Incoming Orders' },
  { href: '/supplier/flash-deals', icon: 'flash-deals',  label: 'Flash Deals' },
  // ── Intelligence
  { href: '/supplier/demand',      icon: 'demand',       label: 'Demand Intel',  divider: true, sectionLabel: 'Intelligence' },
  { href: '/supplier/coverage',    icon: 'coverage',     label: 'Coverage Zones' },
  // ── Account
  { href: '/supplier/wallet',      icon: 'wallet',       label: 'Wallet',        divider: true, sectionLabel: 'Account' },
  { href: '/supplier/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/supplier/settings',    icon: 'settings',     label: 'Settings' },
];

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';
  let roles: string[] = [];

  if (user) {
    const [profileRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, location, roles').eq('user_id', user.id).single(),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    ]);
    if (profileRes.data) {
      profile = { name: profileRes.data.full_name ?? 'Supplier', role: 'Input Supplier' };
      location = profileRes.data.location ?? '';
      roles = profileRes.data.roles ?? [];
      unreadCount = unreadRes.count ?? 0;
    }
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  const navWithBadge = SUPPLIER_NAV.map(item =>
    item.href === '/supplier/notifications' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={roles.length > 1 ? <RoleSwitcher currentRole="supplier" allRoles={roles} /> : undefined} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/supplier/notifications" currentRole="supplier" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <Link href="/supplier/flash-deals" className="fab fab-primary" aria-label="Flash deals" style={{ textDecoration: 'none' }}>
        <Zap size={21} strokeWidth={2.5} color="#fff" />
      </Link>
    </div>
  );
}
