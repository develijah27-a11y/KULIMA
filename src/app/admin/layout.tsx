import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';

const ADMIN_NAV = [
  { href: '/admin/dashboard',    icon: 'dashboard', label: 'Overview' },
  { href: '/admin/users',        icon: 'users',     label: 'Users' },
  { href: '/admin/verification', icon: 'verify',    label: 'KYC Queue' },
  { href: '/admin/prices',       icon: 'prices',    label: 'Prices' },
  { href: '/admin/alert',        icon: 'alerts',    label: 'Alerts' },
  { href: '/admin/buyers',       icon: 'buyers',    label: 'Buyers' },
  { href: '/admin/analytics',    icon: 'analytics', label: 'Analytics' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let profile: { name: string; role: string } | null = null;

  if (session?.user) {
    const { data } = await supabase.from('profiles').select('full_name').eq('user_id', session.user.id).single();
    if (data) profile = { name: data.full_name ?? 'Admin', role: 'Admin' };
  }

  const h = new Date().getHours();
  const first = profile?.name.split(' ')[0] ?? 'Admin';
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first} 👋`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAF9' }}>
      <Sidebar navItems={ADMIN_NAV} profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar greeting={greeting} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav navItems={ADMIN_NAV} />
    </div>
  );
}
