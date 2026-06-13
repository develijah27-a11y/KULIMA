import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';

const FARMER_NAV = [
  { href: '/farmer/dashboard',   icon: 'dashboard',    label: 'Dashboard' },
  // ── Market
  { href: '/farmer/marketplace', icon: 'my-listings',  label: 'My Listings',  divider: true, sectionLabel: 'Market' },
  { href: '/farmer/orders',      icon: 'orders',       label: 'My Orders' },
  { href: '/farmer/inventory',   icon: 'inventory',    label: 'Inventory' },
  { href: '/farmer/prices',      icon: 'prices',       label: 'Live Prices' },
  // ── Farm
  { href: '/farmer/farm',        icon: 'farm',         label: 'My Farm',      divider: true, sectionLabel: 'Farm' },
  { href: '/farmer/farm/workers',icon: 'workers',      label: 'Workers' },
  { href: '/farmer/finance',     icon: 'finance',      label: 'Finance' },
  { href: '/farmer/planting',    icon: 'planting',     label: 'Planting' },
  { href: '/farmer/doctor',      icon: 'doctor',       label: 'Pathologist' },
  // ── Community
  { href: '/farmer/groups',      icon: 'groups',       label: 'Farmer Groups', divider: true, sectionLabel: 'Community' },
  { href: '/farmer/geocluster',  icon: 'geocluster',   label: 'GeoCluster' },
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

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';
  let roles: string[] = [];

  if (user) {
    const [profileRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('full_name, location, roles').eq('user_id', user.id).single(),
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false),
    ]);
    if (profileRes.data) {
      profile = { name: profileRes.data.full_name ?? 'Farmer', role: 'Farmer' };
      location = profileRes.data.location ?? '';
      roles = profileRes.data.roles ?? [];
    }
    unreadCount = unreadRes.count ?? 0;
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  // Badge unread count on notifications
  const navWithBadge = FARMER_NAV.map(item =>
    item.href === '/farmer/notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={roles.length > 1 ? <RoleSwitcher currentRole="farmer" allRoles={roles} /> : undefined} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/farmer/notifications" currentRole="farmer" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav navItems={navWithBadge} />
    </div>
  );
}
