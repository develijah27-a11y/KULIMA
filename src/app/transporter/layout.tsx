import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';

const TRANSPORTER_NAV = [
  { href: '/transporter/dashboard',   icon: 'dashboard',   label: 'Dashboard' },
  { href: '/transporter/deliveries',  icon: 'orders',      label: 'Deliveries' },
  { href: '/transporter/vehicle',     icon: 'marketplace', label: 'My Vehicle' },
  { href: '/transporter/wallet',      icon: 'wallet',      label: 'Earnings' },
  { href: '/transporter/profile',     icon: 'profile',     label: 'Profile' },
];

export default async function TransporterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let profile: { name: string; role: string } | null = null;
  let location = '';

  if (session?.user) {
    const { data } = await supabase.from('profiles').select('full_name, location').eq('user_id', session.user.id).single();
    if (data) {
      profile  = { name: data.full_name ?? 'Transporter', role: 'Transporter' };
      location = data.location ?? '';
    }
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAF9' }}>
      <Sidebar navItems={TRANSPORTER_NAV} profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={0} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav navItems={TRANSPORTER_NAV} />
    </div>
  );
}
