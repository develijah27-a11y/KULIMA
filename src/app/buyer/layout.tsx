import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';

const BUYER_NAV = [
  { href: '/buyer/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/buyer/listings',  icon: 'listings',  label: 'Browse' },
  { href: '/buyer/offers',    icon: 'offers',    label: 'My Offers' },
  { href: '/buyer/orders',    icon: 'orders',    label: 'Orders' },
  { href: '/buyer/prices',    icon: 'prices',    label: 'Prices' },
  { href: '/buyer/profile',   icon: 'profile',   label: 'Profile' },
];

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let profile: { name: string; role: string } | null = null;
  let unreadCount = 0;
  let location = '';

  if (session?.user) {
    const [profileRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('full_name, location').eq('user_id', session.user.id).single(),
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('farmer_id', session.user.id)
        .eq('read', false),
    ]);
    if (profileRes.data) {
      profile = { name: profileRes.data.full_name ?? 'Buyer', role: 'Buyer' };
      location = profileRes.data.location ?? '';
    }
    unreadCount = unreadRes.count ?? 0;
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAF9' }}>
      <Sidebar navItems={BUYER_NAV} profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav navItems={BUYER_NAV} />
    </div>
  );
}
