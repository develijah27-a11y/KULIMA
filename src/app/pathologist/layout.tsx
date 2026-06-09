import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';

const PATHOLOGIST_NAV = [
  { href: '/pathologist/dashboard',       icon: 'dashboard',      label: 'Dashboard' },
  // ── Cases
  { href: '/pathologist/cases',           icon: 'case-queue',     label: 'Case Queue',      divider: true, sectionLabel: 'Cases' },
  { href: '/pathologist/cases/urgent',    icon: 'urgent-cases',   label: 'Urgent Cases' },
  { href: '/pathologist/cases/mine',      icon: 'my-cases',       label: 'My Cases' },
  { href: '/pathologist/cases/resolved',  icon: 'resolved',       label: 'Resolved' },
  // ── Intelligence
  { href: '/pathologist/geocluster',      icon: 'geo-map',        label: 'GeoCluster Map',  divider: true, sectionLabel: 'Intelligence' },
  { href: '/pathologist/alerts',          icon: 'disease-alerts', label: 'Disease Alerts' },
  // ── Account
  { href: '/pathologist/profile',         icon: 'profile',        label: 'My Profile',      divider: true, sectionLabel: 'Account' },
  { href: '/pathologist/wallet',          icon: 'earnings',       label: 'Wallet & Earnings' },
  { href: '/pathologist/notifications',   icon: 'notifications',  label: 'Notifications' },
  { href: '/pathologist/settings',        icon: 'settings',       label: 'Settings' },
];

export default async function PathologistLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';

  if (session?.user) {
    const [profileRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('full_name, location').eq('user_id', session.user.id).single(),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('farmer_id', session.user.id).eq('read', false),
    ]);
    if (profileRes.data) {
      profile = { name: profileRes.data.full_name ?? 'Pathologist', role: 'Plant Pathologist' };
      location = profileRes.data.location ?? '';
    }
    unreadCount = unreadRes.count ?? 0;
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  const navWithBadge = PATHOLOGIST_NAV.map(item =>
    item.href === '/pathologist/notifications' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/pathologist/notifications" />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
      <MobileNav navItems={navWithBadge} />
    </div>
  );
}
