import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles').select('*').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [farmersRes, newFarmersRes, listingsRes, dealsRes] = await Promise.all([
    (supabase.from as any)('profiles').select('*', { count: 'exact', head: true }),
    (supabase.from as any)('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    (supabase.from as any)('listings').select('*', { count: 'exact', head: true }).eq('status','active'),
    (supabase.from as any)('offers').select('*,listing:listings(*)').eq('status','completed').gte('created_at', monthStart),
  ]);

  const gmv = (dealsRes.data ?? []).reduce((sum: number, o: any) => sum + ((o?.listing?.quantity_kg ?? 0) * (o as any).offered_price), 0);

  return (
    <div className="min-h-screen bg-soil">
      <header className="border-b border-surface2 bg-surface sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-cream" style={{ fontFamily: 'var(--font-display)' }}>Admin Panel</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Farmers', value: farmersRes.count ?? 0, emoji: '👥' },
            { label: 'New This Week', value: newFarmersRes.count ?? 0, emoji: '🆕' },
            { label: 'Active Listings', value: listingsRes.count ?? 0, emoji: '📦' },
            { label: 'GMV This Month', value: `UGX ${Math.round(gmv).toLocaleString()}`, emoji: '💰' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-surface border border-surface2 p-5 text-center">
              <span className="text-2xl">{s.emoji}</span>
              <p className="text-xl font-extrabold text-cream mt-1 font-mono">{s.value}</p>
              <p className="text-[11px] text-cream/35">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-cream/40">Admin tools ready after applying the Supabase migration.</p>
      </main>
    </div>
  );
}
