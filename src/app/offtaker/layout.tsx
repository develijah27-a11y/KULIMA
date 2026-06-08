import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';

const OFFTAKER_NAV = [
  { href: '/offtaker/dashboard',    icon: 'dashboard',    label: 'Dashboard' },
  // ── Procurement
  { href: '/offtaker/contracts',    icon: 'contracts',    label: 'Contracts',       divider: true, sectionLabel: 'Procurement' },
  { href: '/offtaker/pipeline',     icon: 'pipeline',     label: 'Supply Pipeline' },
  { href: '/offtaker/scorecard',    icon: 'scorecard',    label: 'Supplier Scorecard' },
  // ── Analytics
  { href: '/offtaker/spend',        icon: 'spend',        label: 'Spend Analytics', divider: true, sectionLabel: 'Analytics' },
  { href: '/offtaker/quality',      icon: 'quality',      label: 'Quality & Compliance' },
  { href: '/offtaker/risk',         icon: 'risk-alerts',  label: 'Risk Alerts' },
  // ── Communication
  { href: '/offtaker/messages',     icon: 'messages',     label: 'Messages',        divider: true, sectionLabel: 'Communication' },
  { href: '/offtaker/invoices',     icon: 'invoices',     label: 'Invoices' },
  // ── Account
  { href: '/offtaker/wallet',       icon: 'wallet',       label: 'Wallet',          divider: true, sectionLabel: 'Account' },
  { href: '/offtaker/notifications',icon: 'notifications',label: 'Notifications' },
  { href: '/offtaker/settings',     icon: 'settings',     label: 'Settings' },
];

export default async function OfftakerLayout({ children }: { children: React.ReactNode }) {
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
      profile = { name: profileRes.data.full_name ?? 'Offtaker', role: 'Offtaker' };
      location = profileRes.data.location ?? '';
    }
    unreadCount = unreadRes.count ?? 0;
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  const navWithBadge = OFFTAKER_NAV.map(item =>
    item.href === '/offtaker/notifications' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAF9' }}>
      <Sidebar navItems={navWithBadge} profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} notificationsHref="/offtaker/notifications" />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
      <MobileNav navItems={navWithBadge} />
    </div>
  );
}
