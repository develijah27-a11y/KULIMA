import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Stethoscope } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { PageTransition } from '@/components/ui/PageTransition';
import { NavCommandPalette } from '@/components/ui/NavCommandPalette';

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
  { href: '/pathologist/consultations',    icon: 'consultations',  label: 'Consultations',   divider: true, sectionLabel: 'Work' },
  // ── Account
  { href: '/pathologist/profile',         icon: 'profile',        label: 'My Profile',      divider: true, sectionLabel: 'Account' },
  { href: '/pathologist/wallet',          icon: 'earnings',       label: 'Wallet & Earnings' },
  { href: '/pathologist/notifications',   icon: 'notifications',  label: 'Notifications' },
  { href: '/pathologist/settings',        icon: 'settings',       label: 'Settings' },
];

export default async function PathologistLayout({ children }: { children: React.ReactNode }) {
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
    if (!userRoles.includes('pathologist') && primaryRole !== 'pathologist' && primaryRole !== 'admin') redirect('/dashboard');

    profile = { name: profileRes.data.full_name ?? 'Pathologist', role: 'Plant Pathologist' };
    location = profileRes.data.location ?? '';
    roles = userRoles;
    unreadCount = unreadRes.count ?? 0;
  } else {
    redirect('/onboarding/role');
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;

  const navWithBadge = PATHOLOGIST_NAV.map(item =>
    item.href === '/pathologist/notifications' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="pathologist" allRoles={roles} />} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/pathologist/notifications" currentRole="pathologist" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6"><PageTransition>{children}</PageTransition></main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <Link href="/pathologist/cases" className="fab fab-primary" aria-label="Case queue" style={{ textDecoration: 'none' }}>
        <Stethoscope size={21} strokeWidth={2.5} color="#fff" />
      </Link>
      <NavCommandPalette items={navWithBadge} />
    </div>
  );
}
