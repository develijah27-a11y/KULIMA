import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { PageTransition } from '@/components/ui/PageTransition';
import { NavCommandPalette } from '@/components/ui/NavCommandPalette';

const FARMER_NAV = [
  { href: '/farmer/dashboard',   icon: 'dashboard',    label: 'Dashboard' },
  // ── Market
  { href: '/farmer/marketplace', icon: 'my-listings',  label: 'My Listings',  divider: true, sectionLabel: 'Market' },
  { href: '/farmer/orders',      icon: 'orders',       label: 'My Orders' },
  { href: '/farmer/inputs',      icon: 'inventory',    label: 'My Inputs' },
  { href: '/farmer/deliveries',  icon: 'deliveries',   label: 'Deliveries' },
  { href: '/farmer/inventory',   icon: 'inventory',    label: 'Inventory' },
  { href: '/farmer/prices',      icon: 'prices',       label: 'Market Prices' },
  // ── Farm
  { href: '/farmer/farm',        icon: 'farm',         label: 'My Farm',      divider: true, sectionLabel: 'Farm' },
  { href: '/farmer/farm/workers',icon: 'workers',      label: 'Workers' },
  { href: '/farmer/finance',     icon: 'finance',      label: 'Money & Loans' },
  { href: '/farmer/planting',    icon: 'planting',     label: 'Planting' },
  { href: '/farmer/doctor',      icon: 'doctor',       label: 'Crop Doctor' },
  // ── Community
  { href: '/farmer/groups',      icon: 'groups',       label: 'Farmer Groups', divider: true, sectionLabel: 'Community' },
  { href: '/farmer/geocluster',  icon: 'geocluster',   label: 'Farmers Near Me' },
  { href: '/farmer/weather',     icon: 'weather',      label: 'Weather' },
  // ── Account
  { href: '/farmer/wallet',      icon: 'wallet',       label: 'Wallet',       divider: true, sectionLabel: 'Account' },
  { href: '/farmer/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/farmer/verify',      icon: 'verify',       label: 'Get Verified' },
  { href: '/farmer/settings',    icon: 'settings',     label: 'Settings' },
];

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Defense-in-depth: middleware handles most cases but this catches edge cases
  if (!user) redirect('/auth/signin');

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';
  let roles: string[] = [];

  // Parallel: profile + unread count. RLS on notifications filters by auth.uid() automatically.
  const [profileRes, unreadRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, location, role, roles').eq('user_id', user.id).single(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
  ]);

  if (profileRes.data) {
    const userRoles: string[] = profileRes.data.roles ?? [];
    const primaryRole: string = (profileRes.data as any).role ?? '';
    // Role guard: must have 'farmer' in roles array, OR be an admin
    if (!userRoles.includes('farmer') && primaryRole !== 'farmer' && primaryRole !== 'admin') redirect('/dashboard');

    profile = { name: profileRes.data.full_name ?? 'Farmer', role: 'Farmer' };
    location = profileRes.data.location ?? '';
    roles = userRoles;
    unreadCount = unreadRes.count ?? 0;
  } else {
    // No profile yet → onboarding
    redirect('/onboarding/role');
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;

  // Badge unread count on notifications
  const navWithBadge = FARMER_NAV.map(item =>
    item.href === '/farmer/notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="farmer" allRoles={roles} />} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/farmer/notifications" currentRole="farmer" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <Link
        href="/farmer/marketplace/new"
        className="fab fab-primary"
        aria-label="New listing"
        style={{ textDecoration: 'none' }}
      >
        <Plus size={22} strokeWidth={2.5} color="#fff" />
      </Link>
      <NavCommandPalette items={navWithBadge} />
    </div>
  );
}
