import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';

const BUYER_NAV = [
  { href: '/buyer/dashboard',    icon: 'dashboard',    label: 'Dashboard' },
  // ── Sourcing
  { href: '/buyer/listings',     icon: 'marketplace',  label: 'Marketplace',  divider: true, sectionLabel: 'Sourcing' },
  { href: '/buyer/requests',     icon: 'requests',     label: 'My Requests' },
  { href: '/buyer/orders',       icon: 'orders',       label: 'My Orders' },
  { href: '/buyer/contracts',    icon: 'contracts',    label: 'Contracts' },
  // ── Logistics
  { href: '/buyer/deliveries',   icon: 'deliveries',   label: 'Deliveries',   divider: true, sectionLabel: 'Logistics' },
  { href: '/buyer/cold-chain',   icon: 'cold-chain',   label: 'Cold Chain' },
  // ── Account
  { href: '/buyer/wallet',       icon: 'wallet',       label: 'Wallet',       divider: true, sectionLabel: 'Account' },
  { href: '/buyer/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/buyer/settings',     icon: 'settings',     label: 'Settings' },
];

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
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
      profile = { name: profileRes.data.full_name ?? 'Buyer', role: 'Buyer' };
      location = profileRes.data.location ?? '';
      roles = profileRes.data.roles ?? [];
    }
    unreadCount = unreadRes.count ?? 0;
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  const navWithBadge = BUYER_NAV.map(item =>
    item.href === '/buyer/notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={roles.length > 1 ? <RoleSwitcher currentRole="buyer" allRoles={roles} /> : undefined} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/buyer/notifications" />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav navItems={navWithBadge} />
    </div>
  );
}
