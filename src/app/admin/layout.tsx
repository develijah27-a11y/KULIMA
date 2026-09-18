import '../dashboard.css';
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
import { isCulpritAdminName } from '@/lib/admin-guard';
import { getTimeGreeting } from '@/lib/greeting';

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
  { href: '/admin/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/admin/alert',        icon: 'alert',         label: 'Broadcast Alert' },
  { href: '/admin/analytics',    icon: 'analytics',    label: 'Analytics',  divider: true, sectionLabel: 'Reports' },
  { href: '/admin/revenue',      icon: 'finance',      label: 'Revenue' },
  { href: '/admin/audit-logs',   icon: 'history',      label: 'Audit Logs' },
  { href: '/admin/logs',         icon: 'system-logs',  label: 'System Logs' },
  { href: '/admin/security',     icon: 'alert',        label: 'Security' },
  { href: '/admin/moderation',   icon: 'fraud',        label: 'Moderation' },
  { href: '/admin/support',      icon: 'support',      label: 'Support Tickets', divider: true, sectionLabel: 'Support' },
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
  const fullName: string = (data as any)?.full_name ?? '';

  if (isCulpritAdminName(fullName, user.email)) {
    logSystemEvent({ category: 'auth_failure', level: 'error', route: '/admin', userId: user.id, message: 'Culprit test admin account blocked from /admin' });
    redirect('/auth/signin');
  }

  if (primaryRole !== 'admin' && !userRoles.includes('admin')) {
    logSystemEvent({ category: 'auth_failure', level: 'error', route: '/admin', userId: user.id, message: 'Non-admin user attempted to access /admin' });
    redirect('/dashboard');
  }

  let profile: { name: string; role: string } | null = null;
  let location = '';
  let roles: string[] = [];
  let unreadCount = 0;
  let openTicketsCount = 0;
  let openDisputesCount = 0;
  let pendingKycCount = 0;

  if (data) {
    profile = { name: (data as any).full_name ?? 'Admin', role: 'Admin' };
    location = (data as any).location ?? '';
    roles = (data as any).roles ?? [];

    const [notifRes, ticketRes, disputeRes, kycRes] = await Promise.allSettled([
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false).eq('role', 'admin'),
      (supabase.from as any)('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      (supabase.from as any)('disputes').select('id', { count: 'exact', head: true }).in('status', ['open', 'under_review']),
      (supabase.from as any)('verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    unreadCount = notifRes.status === 'fulfilled' ? (notifRes.value.count ?? 0) : 0;
    openTicketsCount = ticketRes.status === 'fulfilled' ? (ticketRes.value.count ?? 0) : 0;
    openDisputesCount = disputeRes.status === 'fulfilled' ? (disputeRes.value.count ?? 0) : 0;
    pendingKycCount = kycRes.status === 'fulfilled' ? (kycRes.value.count ?? 0) : 0;
  }

  const first = profile?.name.split(' ')[0] ?? 'Admin';
  const greeting = getTimeGreeting(first);

  const navWithBadge = ADMIN_NAV.map(item => {
    if (item.href === '/admin/notifications' && unreadCount > 0) return { ...item, badge: unreadCount };
    if (item.href === '/admin/support' && openTicketsCount > 0) return { ...item, badge: openTicketsCount };
    if (item.href === '/admin/disputes' && openDisputesCount > 0) return { ...item, badge: openDisputesCount };
    if (item.href === '/admin/verification' && pendingKycCount > 0) return { ...item, badge: pendingKycCount };
    return item;
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar
        navItems={navWithBadge}
        profile={profile}
        roleSwitcher={<RoleSwitcher currentRole="admin" allRoles={roles} />}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/admin/notifications" currentRole="admin" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <MobileSidebarDrawer navItems={navWithBadge} profile={profile} roleSwitcher={<RoleSwitcher currentRole="admin" allRoles={roles} />} />
      <NavCommandPalette items={navWithBadge} />
    </div>
  );
}
