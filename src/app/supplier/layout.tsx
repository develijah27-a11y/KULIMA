import { redirect } from 'next/navigation';
import { Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { PageTransition } from '@/components/ui/PageTransition';
import { NavCommandPalette } from '@/components/ui/NavCommandPalette';
import { DashboardFab } from '@/components/layout/DashboardFab';
import { logSystemEvent } from '@/lib/system-log';

const SUPPLIER_NAV = [
  { href: '/supplier/dashboard',   icon: 'dashboard',    label: 'Dashboard' },
  // ── Products
  { href: '/supplier/catalogue',   icon: 'catalogue',    label: 'Inventory',    divider: true, sectionLabel: 'Inventory' },
  { href: '/pos/till',             icon: 'pos',          label: 'Point of Sale' },
  { href: '/supplier/orders',      icon: 'orders',       label: 'New Orders' },
  { href: '/supplier/returns',     icon: 'orders',       label: 'Returns' },
  { href: '/supplier/flash-deals', icon: 'flash-deals',  label: 'Quick Deals' },
  { href: '/supplier/deliveries',  icon: 'deliveries',   label: 'Deliveries' },
  // ── Market Info
  { href: '/supplier/demand',      icon: 'demand',       label: 'What Farmers Need', divider: true, sectionLabel: 'Market Info' },
  { href: '/supplier/coverage',    icon: 'coverage',     label: 'Service Area' },
  // ── Account
  { href: '/supplier/wallet',      icon: 'wallet',       label: 'Wallet',        divider: true, sectionLabel: 'Account' },
  { href: '/supplier/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/supplier/account',     icon: 'verify',       label: 'My Account' },
  { href: '/supplier/premium',     icon: 'premium',      label: 'Business' },
  { href: '/supplier/support',     icon: 'support',      label: 'Support' },
  { href: '/supplier/settings',    icon: 'settings',     label: 'Settings' },
];

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';
  let roles: string[] = [];

  const [profileRes, unreadRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, location, role, roles').eq('user_id', user.id).single(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false).or('role.eq.supplier,role.is.null'),
  ]);

  if (profileRes.data) {
    const userRoles: string[] = profileRes.data.roles ?? [];
    const primaryRole: string = (profileRes.data as any).role ?? '';
    if (!userRoles.includes('supplier') && primaryRole !== 'supplier' && primaryRole !== 'admin') {
      logSystemEvent({ category: 'auth_failure', level: 'warn', route: '/supplier', userId: user.id, message: 'Role mismatch: user without supplier role attempted /supplier' });
      redirect('/dashboard');
    }

    profile = { name: profileRes.data.full_name ?? 'Agro-dealer', role: 'Agro-dealer' };
    location = profileRes.data.location ?? '';
    roles = userRoles;
    unreadCount = unreadRes.count ?? 0;
  } else {
    redirect('/onboarding/role');
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;

  const navWithBadge = SUPPLIER_NAV.map(item =>
    item.href === '/supplier/notifications' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="supplier" allRoles={roles} />} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/supplier/notifications" currentRole="supplier" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6"><PageTransition>{children}</PageTransition></main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <MobileSidebarDrawer navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="supplier" allRoles={roles} />} />
      <DashboardFab href="/supplier/flash-deals" ariaLabel="Flash deals">
        <Zap size={21} strokeWidth={2.5} color="#fff" />
      </DashboardFab>
      <NavCommandPalette items={navWithBadge} />
    </div>
  );
}
