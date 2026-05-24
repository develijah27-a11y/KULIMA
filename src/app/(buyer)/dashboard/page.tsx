import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default async function BuyerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles').select('*').eq('user_id', user.id).single();

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [activeRes, pendingRes, completedRes] = await Promise.all([
    (supabase.from as any)('listings').select('*', { count: 'exact', head: true }).eq('status','active').eq('crop_type', (profile as any)?.primary_crop ?? 'maize'),
    (supabase.from as any)('offers').select('*', { count: 'exact', head: true }).eq('buyer_id', user.id).eq('status', 'pending'),
    (supabase.from as any)('offers').select('*', { count: 'exact', head: true }).eq('buyer_id', user.id).eq('status', 'completed').gte('created_at', weekAgo),
  ]);

  return (
    <div className="min-h-screen bg-soil">
      <header className="border-b border-surface2 bg-surface sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-cream">Buyer Dashboard</h1>
          <span className="text-xs text-cream/35">{profile?.full_name ?? 'Buyer'}</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Listings', value: activeRes.count ?? 0, emoji: '🌾' },
            { label: 'Pending Offers', value: pendingRes.count ?? 0, emoji: '💬' },
            { label: 'Completed (7d)', value: completedRes.count ?? 0, emoji: '✅' },
            { label: 'Season Volume', value: '— kg', emoji: '📦' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-surface border border-surface2 p-5 text-center">
              <span className="text-2xl">{s.emoji}</span>
              <p className="text-2xl font-extrabold text-cream mt-1 font-mono">{s.value}</p>
              <p className="text-[11px] text-cream/35">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <a href="listings"><Button variant="secondary" className="w-full">📋 Browse Listings</Button></a>
          <a href="offers"><Button variant="secondary" className="w-full">💬 My Offers</Button></a>
        </div>
      </main>
    </div>
  );
}
