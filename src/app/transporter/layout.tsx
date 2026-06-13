import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';

const TRANSPORTER_NAV = [
  { href: '/transporter/dashboard',  icon: 'dashboard',    label: 'Dashboard' },
  // ── Jobs
  { href: '/transporter/job-queue',  icon: 'job-queue',    label: 'Job Queue',    divider: true, sectionLabel: 'Jobs' },
  { href: '/transporter/active',     icon: 'active-jobs',  label: 'Active Jobs' },
  { href: '/transporter/deliveries', icon: 'deliveries',   label: 'Completed' },
  // ── Fleet
  { href: '/transporter/vehicle',    icon: 'farm',         label: 'My Fleet',     divider: true, sectionLabel: 'Fleet' },
  { href: '/transporter/cold-chain', icon: 'cold-logs',    label: 'Cold Chain Logs' },
  // ── Account
  { href: '/transporter/wallet',     icon: 'earnings',     label: 'Wallet & Earnings', divider: true, sectionLabel: 'Account' },
  { href: '/transporter/notifications', icon: 'notifications', label: 'Notifications' },
  { href: '/transporter/settings',   icon: 'settings',     label: 'Settings' },
];

export default async function TransporterLayout({ children }: { children: React.ReactNode }) {
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
      profile = { name: profileRes.data.full_name ?? 'Driver', role: 'Delivery Agent' };
      location = profileRes.data.location ?? '';
      roles = profileRes.data.roles ?? [];
    }
    unreadCount = unreadRes.count ?? 0;
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  const navWithBadge = TRANSPORTER_NAV.map(item =>
    item.href === '/transporter/notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={roles.length > 1 ? <RoleSwitcher currentRole="transporter" allRoles={roles} /> : undefined} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/transporter/notifications" currentRole="transporter" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav navItems={navWithBadge} />
    </div>
  );
}
