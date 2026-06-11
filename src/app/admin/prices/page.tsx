import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DISTRICT_NAMES } from '@/lib/districts';
import { PriceEditor } from './PriceEditor';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
};

export default async function AdminPricesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') redirect('/farmer/dashboard');

  const sinceDate = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: rawPrices } = await (supabase.from as any)('market_prices')
    .select('id, crop_type, price_per_kg, market_name, district, recorded_at, source')
    .gte('recorded_at', sinceDate)
    .order('recorded_at', { ascending: false })
    .limit(300);

  const prices = (rawPrices ?? []) as {
    id: string; crop_type: string; price_per_kg: number;
    market_name: string; district: string; recorded_at: string; source: string;
  }[];

  const seen = new Set<string>();
  const latest = prices.filter((p) => {
    const k = `${p.crop_type}__${p.district ?? 'national'}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const byDistrict: Record<string, typeof latest> = {};
  for (const p of latest) {
    const d = p.district ?? 'National';
    if (!byDistrict[d]) byDistrict[d] = [];
    byDistrict[d].push(p);
  }
  const districts = Object.keys(byDistrict).sort();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '4px' }}>
          Market Price Management
        </h1>
        <p style={{ fontSize: '13px', color: C.muted }}>
          {latest.length} price entries across {districts.length} districts in the last 7 days
        </p>
      </div>

      <PriceEditor districts={DISTRICT_NAMES.sort()} />

      {districts.map((dist) => (
        <div
          key={dist}
          style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, overflow: 'hidden' }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{dist}</p>
              <p style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{byDistrict[dist].length} crops tracked</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  {['Crop', 'Market', 'Price /kg', 'Source', 'Updated'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: 700, color: C.muted, textTransform: 'uppercase',
                        letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byDistrict[dist].map((p) => {
                  const recorded = new Date(p.recorded_at);
                  const hoursAgo = Math.round((Date.now() - recorded.getTime()) / 3600000);
                  const age = hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
                  const isStale = hoursAgo > 48;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>
                        {p.crop_type.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: C.muted }}>
                        {p.market_name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: C.text }}>
                        UGX {Math.round(p.price_per_kg).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                            background: p.source === 'admin' ? 'var(--color-sky-bg)' : p.source === 'system' ? 'var(--color-surface-2)' : 'var(--color-success-bg)',
                            color: p.source === 'admin' ? 'var(--color-info)' : p.source === 'system' ? C.muted : 'var(--color-success)',
                          }}
                        >
                          {p.source}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: isStale ? 'var(--color-danger)' : C.muted }}>
                        {age}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
