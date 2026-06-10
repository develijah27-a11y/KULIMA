import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DISTRICT_NAMES } from '@/lib/districts';
import { PriceEditor } from './PriceEditor';

export default async function AdminPricesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') redirect('/farmer/dashboard');

  // Fetch latest prices per crop+district
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

  // Deduplicate: latest per crop+district
  const seen = new Set<string>();
  const latest = prices.filter((p) => {
    const k = `${p.crop_type}__${p.district ?? 'national'}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Group by district
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
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          Market Price Management
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280' }}>
          {latest.length} price entries across {districts.length} districts in the last 7 days
        </p>
      </div>

      {/* Price upload form */}
      <PriceEditor districts={DISTRICT_NAMES.sort()} />

      {/* Current prices by district */}
      {districts.map((dist) => (
        <div
          key={dist}
          style={{
            background: '#FFFFFF', borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid #E5E7EB' }}
          >
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>{dist}</p>
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                {byDistrict[dist].length} crops tracked
              </p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Crop', 'Market', 'Price /kg', 'Source', 'Updated'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: 700, color: '#6B7280', textTransform: 'uppercase',
                        letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB',
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
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #F3F4F6' }}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#1A1A1A', textTransform: 'capitalize' }}>
                        {p.crop_type.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6B7280' }}>
                        {p.market_name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>
                        UGX {Math.round(p.price_per_kg).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                            background: p.source === 'admin' ? 'var(--color-sky-bg)' : p.source === 'system' ? '#F3F4F6' : '#D1FAE5',
                            color: p.source === 'admin' ? 'var(--color-info)' : p.source === 'system' ? '#6B7280' : '#059669',
                          }}
                        >
                          {p.source}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: isStale ? 'var(--color-danger)' : '#6B7280' }}>
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
