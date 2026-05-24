import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Card, CardHeader } from '@/components/ui/Card';
import { PriceTag } from '@/components/ui/PriceTag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const WEATHER_EMOJI: Record<string, string> = {
  '01d': '☀️','01n': '🌙','02d': '🌤','02n': '🌤','03d': '⛅','03n': '⛅',
  '04d': '☁️','04n': '☁️','09d': '🌦','10d': '🌧️','11d': '⛈️','13d': '❄️','50d': '🌫️',
};

const cropEmojis: Record<string, string> = {
  maize: '🌽', beans: '🥜', tomatoes: '🍅', cassava: '🍠', rice: '🍚',
  coffee: '☕', groundnuts: '🥜', sweet_potatoes: '🍠', bananas: '🍌', sunflower: '🌻',
};

async function getCachedPrices() {
  const supabase = await import('@/lib/supabase/server').then((m) => m.createClient());
  const { data } = await supabase
    .from('market_prices')
    .select('*')
    .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('recorded_at', { ascending: false });
  return data ?? [];
}

function Sparkline({ prices }: { prices: { recorded_at: string; price_per_kg: number }[] }) {
  const values = prices.map(p => p.price_per_kg);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200, h = 40, pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const path = `M${pts.join(' L')}`;
  const color = values.at(-1)! >= values[0]! ? '#7DB55A' : '#C4723A';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function PricesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

  const prices = await getCachedPrices();
  const cropGroups: Record<string, any[]> = {};
  prices.forEach((p: any) => { if (!cropGroups[p.crop_type]) cropGroups[p.crop_type] = []; cropGroups[p.crop_type].push(p); });

  const cropList = Object.entries(cropGroups).map(([crop, ps]) => {
    const sorted = [...ps].sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    const latest = sorted[0];
    const prev = sorted[1];
    const change = prev ? ((latest.price_per_kg - prev.price_per_kg) / prev.price_per_kg) * 100 : 0;
    return { cropType: crop, pricePerKg: latest.price_per_kg, marketName: latest.market_name, changePercent: +change.toFixed(2), history: sorted.slice(0, 7).reverse() };
  });

  const selectedCrop = profile?.primary_crop ?? 'maize';
  const featured = cropList.find(c => c.cropType === selectedCrop) ?? cropList[0];

  return (
    <div className="min-h-screen bg-soil pb-24">
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Crop filter">
          {['All Crops','My Crops','Seeds','Fertilizer','Tools'].map(chip => (
            <button
              key={chip}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                chip === 'All Crops'
                  ? 'bg-sprout text-soil'
                  : 'bg-surface2 text-cream/60'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Featured crop hero */}
        {featured && (
          <Card variant="elevated" className="text-center py-7">
            <span className="text-6xl" role="img">{cropEmojis[featured.cropType] ?? '🌾'}</span>
            <p className="mt-2 text-lg font-bold text-cream capitalize" style={{ fontFamily: 'var(--font-headline)' }}>
              {featured.cropType.replace('_',' ')}
            </p>
            <p className="text-xs text-cream/35">{featured.marketName} · Best today</p>
            <PriceTag value={featured.pricePerKg} size="lg" className="mt-3 justify-center" />
            {featured.history.length > 0 && (
              <div className="mt-4 mx-4 rounded-lg overflow-hidden bg-surface2">
                <Sparkline prices={featured.history.map(h => ({ recorded_at: h.recorded_at, price_per_kg: h.price_per_kg }))} />
              </div>
            )}
            <div className="mt-4 flex justify-center gap-3 text-xs">
              <span className="text-cream/35">My crop: {cropEmojis[selectedCrop] ?? '🌾'} {selectedCrop}</span>
              <span className={`font-bold ${featured.changePercent >= 0 ? 'text-sprout' : 'text-clay'}`}>
                {featured.changePercent >= 0 ? '+' : ''}{featured.changePercent}% today
              </span>
            </div>
          </Card>
        )}

        {/* Market comparison */}
        <Card>
          <CardHeader title="Market Comparison" subtitle="Best prices across markets today" />
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs" role="grid">
              <thead>
                <tr className="border-b border-surface2 text-cream/35">
                  <th className="text-left py-2 px-2 font-semibold">Market</th>
                  <th className="text-right py-2 px-2 font-semibold">Price/kg</th>
                  <th className="text-right py-2 px-2 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {cropList
                  .filter((c) => c.cropType === (featured?.cropType ?? 'maize'))
                  .sort((a, b) => b.pricePerKg - a.pricePerKg)
                  .map((c) => {
                    const isBest = c === featured;
                    return (
                      <tr key={c.marketName} className="border-b border-surface2/50 last:border-none">
                        <td className="py-2 px-2 text-cream/70 flex items-center gap-1.5">
                          {isBest && <Badge variant="green">BEST</Badge>}
                          {c.marketName}
                        </td>
                        <td className="text-right py-2 px-2">
                          <PriceTag value={c.pricePerKg} size="sm" />
                        </td>
                        <td className={`text-right py-2 px-2 font-mono text-xs ${c.changePercent >= 0 ? 'text-sprout' : 'text-clay'}`}>
                          {c.changePercent >= 0 ? '+' : ''}{c.changePercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Negotiation helper */}
        {featured && (
          <Card variant="surface" className="border-harvest/20">
            <p className="text-xs font-semibold text-harvest mb-1">💬 Negotiation Tip</p>
            <p className="text-xs text-cream/55 leading-relaxed">
              Current {featured.marketName} price: <strong className="text-harvest">UGX {Math.round(featured.pricePerKg).toLocaleString()}/kg</strong>.
              {' '}Counter at{' '}
              <strong className="text-harvest">UGX {Math.round(featured.pricePerKg * 0.93).toLocaleString()}/kg</strong> minimum
              {' '}(7% below market — still fair).
            </p>
          </Card>
        )}

        {/* All crops list */}
        <Card>
          <CardHeader title="All Crops" subtitle="Today's latest prices across markets" />
          <div className="space-y-1.5">
            {cropList.map((c) => (
              <div key={c.cropType} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-soil/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cropEmojis[c.cropType] ?? '🌾'}</span>
                  <span className="text-sm font-semibold text-cream capitalize">
                    {c.cropType.replace('_',' ')}
                  </span>
                </div>
                <PriceTag value={c.pricePerKg} size="sm" />
              </div>
            ))}
          </div>
        </Card>

        {/* Seed & Input tab */}
        <Card>
          <CardHeader title="Seeds & Inputs" subtitle="Current input prices near you" />
          <div className="space-y-2">
            {[
              { name: 'H614D Maize Seed 2kg', brand: 'Mukono Seeds', price: 8500, unit: '2kg bag', dealer: 'Agro-Kampala' },
              { name: 'DAP Fertilizer 50kg', brand: 'Makerere Agro', price: 125000, unit: '50kg bag', dealer: 'Nakasero Agrovet' },
              { name: 'Emamectin Benzoate', brand: 'Syngenta', price: 15000, unit: '100ml', dealer: 'Bugema Agrovet' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface2">
                <div>
                  <p className="text-sm font-semibold text-cream">{item.name}</p>
                  <p className="text-[11px] text-cream/35">{item.brand} · {item.dealer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-harvest">UGX {item.price.toLocaleString()}</p>
                  <p className="text-[10px] text-cream/30">{item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}