import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import {
  LayoutDashboard, ShoppingBag, TrendingUp, Cloud,
  Microscope, CreditCard, User, Leaf,
} from 'lucide-react';

const FARMER_NAV = [
  { href: '/farmer/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/farmer/marketplace',  icon: ShoppingBag,     label: 'Marketplace' },
  { href: '/farmer/prices',       icon: TrendingUp,      label: 'Prices' },
  { href: '/farmer/weather',      icon: Cloud,           label: 'Weather' },
  { href: '/farmer/doctor',       icon: Microscope,      label: 'AI Doctor' },
  { href: '/farmer/farm',         icon: Leaf,            label: 'My Farm' },
  { href: '/farmer/profile',      icon: User,            label: 'Profile' },
];

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
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
      profile = { name: profileRes.data.full_name ?? 'Farmer', role: 'Farmer' };
      location = profileRes.data.location ?? '';
    }
    unreadCount = unreadRes.count ?? 0;
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'there';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAF9' }}>
      <Sidebar navItems={FARMER_NAV} profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} location={location} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav navItems={FARMER_NAV} />
    </div>
  );
}
