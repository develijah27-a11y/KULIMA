import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';

const GROUPS_NAV = [
  { href: '/groups/dashboard',      icon: 'dashboard',    label: 'Dashboard' },
  // ── Group
  { href: '/groups/members',        icon: 'members',      label: 'Members',       divider: true, sectionLabel: 'Group' },
  { href: '/groups/bulk-orders',    icon: 'marketplace',  label: 'Bulk Orders' },
  { href: '/groups/listings',       icon: 'my-listings',  label: 'Group Listings' },
  // ── Finance & Comms
  { href: '/groups/wallet',         icon: 'wallet',       label: 'Group Wallet',  divider: true, sectionLabel: 'Finance & Comms' },
  { href: '/groups/chat',           icon: 'group-chat',   label: 'Group Chat' },
  // ── Reporting
  { href: '/groups/season',         icon: 'season',       label: 'Season Summary',divider: true, sectionLabel: 'Reporting' },
  { href: '/groups/notifications',  icon: 'notifications',label: 'Notifications' },
  { href: '/groups/settings',       icon: 'settings',     label: 'Settings' },
];

export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';
  let roles: string[] = [];

  if (user) {
    const [profileRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, location, roles').eq('user_id', user.id).single(),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    ]);
    if (profileRes.data) {
      profile = { name: profileRes.data.full_name ?? 'Group Lead', role: 'Farmer Group' };
      location = profileRes.data.location ?? '';
      roles = profileRes.data.roles ?? [];
      unreadCount = unreadRes.count ?? 0;
    }
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  const navWithBadge = GROUPS_NAV.map(item =>
    item.href === '/groups/notifications' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--d-page)' }}>
      <Sidebar navItems={navWithBadge} profile={profile} roleSwitcher={roles.length > 1 ? <RoleSwitcher currentRole="groups" allRoles={roles} /> : undefined} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/groups/notifications" currentRole="groups" allRoles={roles} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
      <MobileNav navItems={navWithBadge} />
      <Link href="/groups/chat" className="fab fab-primary" aria-label="Group chat" style={{ textDecoration: 'none' }}>
        <MessageSquare size={21} strokeWidth={2.5} color="#fff" />
      </Link>
    </div>
  );
}
