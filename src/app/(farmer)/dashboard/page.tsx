import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui\Card';
import { Badge } from '@/components/ui\Badge';
import { PriceTag } from '@/components/ui\PriceTag';
import { WeatherCard, getDayLabel, weatherEmoji } from '@/components/farm\WeatherCard';
import { PriceTicker } from '@/components/farm\PriceTicker';
import { AlertList } from '@/components/farm\AlertItem';
import { ShowAlertButton } from './ShowAlertButton';

const WEATHER_EMOJI: Record<string, string> = {
  '01d': '☀️','01n': '🌙','02d': '🌤','02n': '🌤','03d': '⛅','03n': '⛅',
  '04d': '☁️','04n': '☁️','09d': '🌦','10d': '🌧️','11d': '⛈️','13d': '❄️','50d': '🌫️',
};

function GreetingBar({ name, unreadCount }: { name: string; unreadCount: number }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-cream/40 text-xs">{greeting},</p>
        <p className="font-display text-lg font-extrabold text-cream">{name}</p>
      </div>
      <button className="relative flex items-center justify-center w-11 h-11 rounded-full bg-surface2" aria-label="Notifications">
        <span>🔔</span>
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-clay text-cream text-[10px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
    </div>
  );
}

export default async function FarmerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [profileRes, priceRes, notifRes, areaRes, bestRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('market_prices').select('*').gte('recorded_at', new Date(Date.now() - 864e5).toISOString()).order('recorded_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('farmer_id', user.id).order('sent_at', { ascending: false }).limit(6),
    supabase.from('farms').select('size_hectares').eq('user_id', user.id),
    supabase.from('market_prices').select('price_per_kg, market_name').eq('crop_type', (profileRes.data as any)?.primary_crop ?? 'maize').gte('recorded_at', new Date(Date.now() - 864e5).toISOString()).order('price_per_kg', { ascending: false }).limit(1),
  ]);

  const profile = profileRes.data;
  const prices = priceRes.data ?? [];
  const notifications = (notifRes.data ?? []).map(n => ({ ...n, farmerId: n.farmer_id, sentAt: n.sent_at }));
  const unreadCount = (notifRes.data ?? []).filter((n: any) => !n.read).length;
  const totalArea = (areaRes.data ?? []).reduce((s: number, f: any) => s + (f.size_hectares ?? 0), 0);
  const bestPrice = bestRes.data?.[0];

  const cropGroups: Record<string, any[]> = {};
  prices.forEach(p => { if (!cropGroups[p.crop_type]) cropGroups[p.crop_type] = []; cropGroups[p.crop_type].push(p); });
  const ticker = Object.entries(cropGroups).map(([c, ps]) => {
    const sorted = [...ps].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    const pct = sorted[1] ? ((sorted[0].price_per_kg - sorted[1].price_per_kg) / sorted[1].price_per_kg) * 100 : 0;
    return { cropType: c, pricePerKg: sorted[0].price_per_kg, marketName: sorted[0].market_name, changePercent: +pct.toFixed(2), id: c, recordedAt: sorted[0].recorded_at, district: '' };
  }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 4);

  // mark all read
  await supabase.from('notifications').update({ read: true }).eq('farmer_id', user.id).eq('read', false);

  const weather = { temp: 28, description: 'partly cloudy', icon: '02d', forecast: Array.from({ length: 6 }, (_, i) => ({ label: getDayLabel(i + 1).slice(0, 3), emoji: i < 3 ? '🌦' : '☀️', temp: 27 + (i % 3) })) };

  return (
    <div className="min-h-screen bg-soil pb-24">
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <ShowAlertButton />
        <GreetingBar name={profile?.full_name ?? 'Friend'} unreadCount={unreadCount} />
        {profile?.latitude && profile?.longitude && (
          <WeatherCard currentTemp={weather.temp} description={weather.description} iconCode={weather.icon} forecast={weather.forecast} locationName={profile.location} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Card variant="elevated"><p className="text-[11px] text-sprout/70 font-semibold uppercase">Farm Area</p><p className="text-2xl font-extrabold text-cream mt-1">{totalArea > 0 ? `${totalArea.toFixed(1)}` : '—'}</p><p className="text-[11px] text-cream/35">hectares</p></Card>
          <Card variant="elevated"><p className="text-[11px] text-harvest/70 font-semibold uppercase">{profile?.primary_crop ?? 'Crop'}</p>
            <PriceTag value={bestPrice?.price_per_kg ?? 0} size="lg" />
            <p className="text-[11px] text-cream/35 mt-0.5">{bestPrice?.market_name ?? '—'}</p></Card>
        </div>
        <Card>
          <p className="text-[11px] text-cream/35 font-semibold uppercase mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            {[['Prices','../prices','📊'],['Sell','../marketplace','🤝'],['Doctor','../doctor','🔬'],['Weather','../weather','🌤']].map(([label, href, emoji]) => (
              <a key={label} href={href} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-surface2 min-h-[52px]">
                <span className="text-xl">{emoji as string}</span>
                <span className="text-[10px] font-semibold text-cream/70">{label}</span>
              </a>
            ))}
          </div>
        </Card>
        <div>
          <p className="text-[11px] text-cream/35 font-semibold uppercase mb-2">Live Prices</p>
          <PriceTicker prices={ticker} />
        </div>
        <AlertList alerts={(notifications as any) as any} />
      </main>
    </div>
  );
}
