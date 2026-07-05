import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { PageTransition } from '@/components/ui/PageTransition';
import { NavCommandPalette } from '@/components/ui/NavCommandPalette';

const BUYER_NAV = [
  { href: '/buyer/dashboard',    icon: 'dashboard',    label: 'Dashboard' },
  // ── Sourcing
  { href: '/buyer/listings',        icon: 'marketplace',  label: 'Browse Market',    divider: true, sectionLabel: 'Buying' },
  { href: '/buyer/group-listings',  icon: 'groups',       label: 'Group Produce' },
  { href: '/buyer/requests',        icon: 'requests',     label: 'My Requests' },
  { href: '/buyer/orders',       icon: 'orders',       label: 'My Orders' },
  { href: '/buyer/favourites',   icon: 'favourites',   label: 'Saved Items' },
  { href: '/buyer/contracts',    icon: 'contracts',    label: 'Agreements' },
  // ── Logistics
  { href: '/buyer/deliveries',   icon: 'deliveries',   label: 'Deliveries',   divider: true, sectionLabel: 'Logistics' },
  { href: '/buyer/cold-chain',   icon: 'cold-chain',   label: 'Cool Transport' },
  // ── Account
  { href: '/buyer/wallet',       icon: 'wallet',       label: 'Wallet',       divider: true, sectionLabel: 'Account' },
  { href: '/buyer/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/buyer/verify',       icon: 'verify',       label: 'Get Verified' },
  { href: '/buyer/settings',     icon: 'settings',     label: 'Settings' },
];

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';
  let roles: string[] = [];

  const [profileRes, unreadRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, location, role, roles').eq('user_id', user.id).single(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
  ]);

  if (profileRes.data) {
    const userRoles: string[] = profileRes.data.roles ?? [];
    const primaryRole: string = (profileRes.data as any).role ?? '';
    if (!userRoles.includes('buyer') && primaryRole !== 'buyer' && primaryRole !== 'admin') redirect('/dashboard');

    profile = { name: profileRes.data.full_name ?? 'Buyer', role: 'Buyer' };
    location = profileRes.data.location ?? '';
    roles = userRoles;
    unreadCount = unreadRes.count ?? 0;
  } else {
    redirect('/onboarding/role');
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;

  const navWithBadge = BUYER_NAV.map(item =>
    item.href === '/buyer/notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="buyer" allRoles={roles} />} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/buyer/notifications" currentRole="buyer" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <MobileSidebarDrawer navItems={navWithBadge} profile={profile} />
      <Link href="/buyer/listings" className="fab fab-primary" aria-label="Browse marketplace" style={{ textDecoration: 'none' }}>
        <ShoppingBag size={21} strokeWidth={2.5} color="#fff" />
      </Link>
      <NavCommandPalette items={navWithBadge} />
    </div>
  );
}
