import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { PageTransition } from '@/components/ui/PageTransition';
import { NavCommandPalette } from '@/components/ui/NavCommandPalette';
import { logSystemEvent } from '@/lib/system-log';

const ADMIN_NAV = [
  { href: '/admin/dashboard',    icon: 'dashboard',    label: 'Overview' },
  { href: '/admin/users',        icon: 'workers',      label: 'Users',      divider: true, sectionLabel: 'Management' },
  { href: '/admin/verification', icon: 'verify',       label: 'KYC Queue' },
  { href: '/admin/buyers',       icon: 'marketplace',  label: 'Buyers' },
  { href: '/admin/disputes',     icon: 'dispute',      label: 'Disputes' },
  { href: '/admin/deliveries',   icon: 'deliveries',   label: 'Deliveries' },
  { href: '/admin/disease-reports', icon: 'disease-alerts', label: 'Disease Reports' },
  { href: '/admin/wallets',      icon: 'finance',      label: 'Wallets' },
  { href: '/admin/fraud',        icon: 'alert',        label: 'Fraud Flags' },
  { href: '/admin/commission',   icon: 'finance',      label: 'Commission', divider: true, sectionLabel: 'Settings' },
  { href: '/admin/listings',     icon: 'marketplace',  label: 'Listings' },
  { href: '/admin/prices',       icon: 'prices',       label: 'Prices',     divider: true, sectionLabel: 'Content' },
  { href: '/admin/alert',        icon: 'notifications',label: 'Alerts' },
  { href: '/admin/analytics',    icon: 'analytics',    label: 'Analytics',  divider: true, sectionLabel: 'Reports' },
  { href: '/admin/audit-logs',   icon: 'history',      label: 'Audit Logs' },
  { href: '/admin/logs',         icon: 'system-logs',  label: 'System Logs' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  const { data } = await supabase
    .from('profiles')
    .select('full_name, role, location, roles')
    .eq('user_id', user.id)
    .single();

  // Hard block — role='admin' OR 'admin' present in the multi-role roles[]
  // array may enter any /admin route. Every other role layout accepts both
  // forms (primary role match OR roles[] membership); this one previously
  // only checked the primary role column, which would incorrectly lock out
  // a multi-role user who has admin as a secondary role.
  const userRoles: string[] = (data as any)?.roles ?? [];
  const primaryRole: string = (data as any)?.role ?? '';
  if (primaryRole !== 'admin' && !userRoles.includes('admin')) {
    logSystemEvent({ category: 'auth_failure', level: 'error', route: '/admin', userId: user.id, message: 'Non-admin user attempted to access /admin' });
    redirect('/dashboard');
  }

  let profile: { name: string; role: string } | null = null;
  let location = '';
  let roles: string[] = [];

  if (data) {
    profile = { name: (data as any).full_name ?? 'Admin', role: 'Admin' };
    location = (data as any).location ?? '';
    roles = (data as any).roles ?? [];
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'Admin';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar
        navItems={ADMIN_NAV}
        profile={profile}
        roleSwitcher={<RoleSwitcher currentRole="admin" allRoles={roles} />}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} currentRole="admin" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav navItems={ADMIN_NAV} />
      <MobileSidebarDrawer navItems={ADMIN_NAV} profile={profile} roleSwitcher={<RoleSwitcher currentRole="admin" allRoles={roles} />} />
      <NavCommandPalette items={ADMIN_NAV} />
    </div>
  );
}
