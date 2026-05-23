import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CropCycle } from '@/types/domain';

const CROP_INTERESTS = [
  'maize','beans','tomatoes','cassava','rice','coffee',
  'groundnuts','sweet_potatoes','bananas','sunflower',
];

async function getFarms(farmerId: string) {
  const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
  const { data } = await supabase.from('farms').select('*').eq('user_id', farmerId);
  return data ?? [];
}

async function getCycles(farmerId: string) {
  const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
  const { data: farms } = await supabase.from('farms').select('id').eq('user_id', farmerId);
  const ids = (farms ?? []).map((f: any) => f.id);
  if (ids.length === 0) return [];
  const { data: crops } = await supabase.from('crops').select('*').in('farm_id', ids).order('created_at', { ascending: false }).limit(10);
  return crops ?? [];
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  const farms = await getFarms(user.id);
  const cycles = (await getCycles(user.id)) as CropCycle[];

  const n = farms.length;
  return (
    <div className="min-h-screen bg-soil pb-24">
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <h1 className="text-xl font-bold text-cream" style={{ fontFamily: 'var(--font-headline)' }}>Profile</h1>

        {/* Personal Info */}
        <Card>
          <CardHeader title="Personal Info" />
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-cream/35 text-xs">Name</p>
              <p className="text-cream">{profile?.full_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-cream/35 text-xs">Phone</p>
              <p className="text-cream">{profile?.phone_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-cream/35 text-xs">District</p>
              <p className="text-cream">{profile?.location ?? '—'}</p>
            </div>
          </div>
        </Card>

        {/* My Farms */}
        <Card>
          <CardHeader title={`My Farms (${n})`} subtitle={`${n} farm${n === 1 ? '' : 's'} registered`} />
          {n === 0 ? (
            <p className="text-cream/30 text-sm py-2">No farms yet.</p>
          ) : (
            <div className="space-y-2">
              {farms.map((f: any) => (
                <div key={f.id} className="flex justify-between py-2 px-1 border-b border-surface2/60 last:border-none text-sm">
                  <span className="text-cream/70">{f.name}</span>
                  <span className="text-cream font-mono">{f.size_hectares ? `${f.size_hectares} ha` : 'N/A'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Crop History */}
        <Card>
          <CardHeader title="Crop History" />
          {cycles.length === 0 ? (
            <p className="text-cream/30 text-sm py-2">No crops tracked yet.</p>
          ) : (
            <div className="space-y-2">
              {cycles.map((c: any) => (
                <div key={c.id} className="flex flex-wrap justify-between items-center gap-2 py-2 px-1 border-b border-surface2/60 last:border-none text-sm">
                  <div>
                    <p className="text-cream font-semibold capitalize">{c.crop_name}</p>
                    <p className="text-[11px] text-cream/30">{c.status}</p>
                  </div>
                  <Badge variant="neutral">{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notifications Settings */}
        <Card>
          <CardHeader title="Notification Settings" />
          {['rain','price','pest','offer'].map(type => (
            <div key={type} className="flex items-center justify-between py-2 text-sm border-b border-surface2/60 last:border-none">
              <span className="text-cream/70 capitalize">{type} alerts</span>
              <Tgl on />
            </div>
          ))}
        </Card>
      </main>
    </div>
  );
}

function Tgl({ on }: { on: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      className={`w-11 h-[26px] rounded-full transition-colors ${on ? 'bg-sprout' : 'bg-surface2'}`}
    >
      <span
        className={`block h-[20px] w-[20px] bg-cream rounded-full shadow-sm transition-transform ${on ? 'translate-x-5.5' : 'translate-x-0.5'}`}
        style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  );
}
