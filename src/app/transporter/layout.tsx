import { redirect } from 'next/navigation';
import { Truck } from 'lucide-react';
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
import { DriverPresenceBroadcaster } from '@/components/transporter/DriverPresenceBroadcaster';

const TRANSPORTER_NAV = [
  { href: '/transporter/dashboard',  icon: 'dashboard',    label: 'Dashboard' },
  // ── Jobs
  { href: '/transporter/job-queue',  icon: 'job-queue',    label: 'Available Jobs', divider: true, sectionLabel: 'Jobs' },
  { href: '/transporter/active',     icon: 'active-jobs',  label: 'Active Jobs' },
  { href: '/transporter/deliveries', icon: 'deliveries',   label: 'Completed' },
  // ── My Vehicle
  { href: '/transporter/vehicle',    icon: 'farm',         label: 'My Vehicle',  divider: true, sectionLabel: 'My Vehicle' },
  { href: '/transporter/cold-chain', icon: 'cold-logs',    label: 'Cool Transport Logs' },
  // ── Account
  { href: '/transporter/wallet',     icon: 'earnings',     label: 'Wallet & Earnings', divider: true, sectionLabel: 'Account' },
  { href: '/transporter/notifications', icon: 'notifications', label: 'Notifications' },
  { href: '/transporter/account',    icon: 'verify',       label: 'My Account' },
  { href: '/transporter/premium',    icon: 'premium',      label: 'Driver Pro' },
  { href: '/transporter/assistant',  icon: 'assistant',     label: 'Copilot' },
  { href: '/transporter/support',    icon: 'support',       label: 'Support' },
  { href: '/transporter/settings',   icon: 'settings',     label: 'Settings' },
];

export default async function TransporterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';
  let roles: string[] = [];

  const [profileRes, unreadRes, vehicleRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, location, role, roles').eq('user_id', user.id).single(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false).or('role.eq.transporter,role.is.null'),
    (supabase.from as any)('vehicles').select('is_available').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profileRes.data) {
    const userRoles: string[] = profileRes.data.roles ?? [];
    const primaryRole: string = (profileRes.data as any).role ?? '';
    if (!userRoles.includes('transporter') && primaryRole !== 'transporter' && primaryRole !== 'admin') {
      logSystemEvent({ category: 'auth_failure', level: 'warn', route: '/transporter', userId: user.id, message: 'Role mismatch: user without transporter role attempted /transporter' });
      redirect('/dashboard');
    }

    profile = { name: profileRes.data.full_name ?? 'Driver', role: 'Delivery Agent' };
    location = profileRes.data.location ?? '';
    roles = userRoles;
    unreadCount = unreadRes.count ?? 0;
  } else {
    redirect('/onboarding/role');
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;

  const navWithBadge = TRANSPORTER_NAV.map(item =>
    item.href === '/transporter/notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="transporter" allRoles={roles} />} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/transporter/notifications" currentRole="transporter" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <MobileSidebarDrawer navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="transporter" allRoles={roles} />} />
      <DashboardFab href="/transporter/job-queue" ariaLabel="View job queue">
        <Truck size={21} strokeWidth={2.5} color="#fff" />
      </DashboardFab>
      <NavCommandPalette items={navWithBadge} />
      <DriverPresenceBroadcaster isAvailable={(vehicleRes.data as any)?.is_available ?? false} />
    </div>
  );
}
