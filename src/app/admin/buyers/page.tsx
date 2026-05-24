import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminBuyersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  const { data: buyers } = await supabase.from('profiles').select('*').eq('role', 'buyer').order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-soil">
      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        <h1 className="text-xl font-bold text-cream">Pending Buyer Verification</h1>
        <div className="space-y-3">
          {(buyers ?? []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface2 gap-3">
              <div>
                <p className="text-sm font-semibold text-cream">{b.full_name}</p>
                <p className="text-[11px] text-cream/35">{b.location} · {b.phone_number}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-sprout text-soil text-xs font-bold hover:opacity-90">Verify</button>
                <button className="px-4 py-2 rounded-xl bg-clay text-cream text-xs font-bold hover:opacity-90">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
