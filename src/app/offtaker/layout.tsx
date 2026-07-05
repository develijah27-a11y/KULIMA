import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { PageTransition } from '@/components/ui/PageTransition';
import { NavCommandPalette } from '@/components/ui/NavCommandPalette';

const OFFTAKER_NAV = [
  { href: '/offtaker/dashboard',    icon: 'dashboard',    label: 'Dashboard' },
  // ── Buying
  { href: '/offtaker/contracts',    icon: 'contracts',    label: 'Agreements',      divider: true, sectionLabel: 'Buying' },
  { href: '/offtaker/pipeline',     icon: 'pipeline',     label: 'My Suppliers' },
  { href: '/offtaker/scorecard',    icon: 'scorecard',    label: 'Rate Farmers' },
  // ── Reports
  { href: '/offtaker/spend',        icon: 'spend',        label: 'My Spending',     divider: true, sectionLabel: 'Reports' },
  { href: '/offtaker/quality',      icon: 'quality',      label: 'Crop Quality' },
  { href: '/offtaker/risk',         icon: 'risk-alerts',  label: 'Risk Alerts' },
  // ── Talk
  { href: '/offtaker/messages',     icon: 'messages',     label: 'Messages',        divider: true, sectionLabel: 'Talk' },
  { href: '/offtaker/invoices',     icon: 'invoices',     label: 'Payment Requests' },
  // ── Account
  { href: '/offtaker/wallet',       icon: 'wallet',       label: 'Wallet',          divider: true, sectionLabel: 'Account' },
  { href: '/offtaker/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/offtaker/verify',       icon: 'verify',       label: 'Get Verified' },
  { href: '/offtaker/settings',     icon: 'settings',     label: 'Settings' },
];

export default async function OfftakerLayout({ children }: { children: React.ReactNode }) {
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
    if (!userRoles.includes('offtaker') && primaryRole !== 'offtaker' && primaryRole !== 'admin') redirect('/dashboard');

    profile = { name: profileRes.data.full_name ?? 'Buyer', role: 'Bulk Buyer' };
    location = profileRes.data.location ?? '';
    roles = userRoles;
    unreadCount = unreadRes.count ?? 0;
  } else {
    redirect('/onboarding/role');
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;

  const navWithBadge = OFFTAKER_NAV.map(item =>
    item.href === '/offtaker/notifications' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="offtaker" allRoles={roles} />} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/offtaker/notifications" currentRole="offtaker" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6"><PageTransition>{children}</PageTransition></main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <MobileSidebarDrawer navItems={navWithBadge} profile={profile} />
      <Link href="/offtaker/contracts" className="fab fab-primary" aria-label="Contracts" style={{ textDecoration: 'none' }}>
        <FileText size={21} strokeWidth={2.5} color="#fff" />
      </Link>
      <NavCommandPalette items={navWithBadge} />
    </div>
  );
}
