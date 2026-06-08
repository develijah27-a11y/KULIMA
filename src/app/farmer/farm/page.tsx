import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const FarmMap = dynamic(() => import('./FarmMapClient').then(m => m.FarmMapClient), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FDF4', borderRadius: 12 }}>
      <p style={{ color: '#40916C', fontSize: 13, fontWeight: 600 }}>Loading map...</p>
    </div>
  ),
});

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB', cardBg: '#FFFFFF',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
  green: '#1B4332', greenMed: '#40916C',
};

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
};

export default async function FarmerFarmPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const { data: farms } = await (supabase.from as any)('farms')
    .select('id, name, location, district, size_hectares, farm_type, crop_types, boundary, is_active, created_at')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const farmList = farms ?? [];
  const totalHa  = farmList.reduce((s: number, f: any) => s + (Number(f.size_hectares) || 0), 0);
  const farmsWithBoundary = farmList.filter((f: any) => f.boundary != null).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Farms
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            {farmList.length} farm{farmList.length !== 1 ? 's' : ''} · {totalHa.toFixed(1)} ha total
          </p>
        </div>
        <Link
          href="/farmer/farm/new"
          style={{ padding: '9px 18px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
        >
          + Add Farm
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: C.green, letterSpacing: '-0.03em' }}>{farmList.length}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: C.muted }}>Farms</p>
        </div>
        <div style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: C.green, letterSpacing: '-0.03em' }}>{totalHa.toFixed(1)}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: C.muted }}>Hectares</p>
        </div>
        <div style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: C.green, letterSpacing: '-0.03em' }}>{farmsWithBoundary}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: C.muted }}>Mapped</p>
        </div>
      </div>

      {/* Map */}
      {farmList.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>Farm Map</p>
            {farmsWithBoundary < farmList.length && (
              <p style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>
                {farmList.length - farmsWithBoundary} farm{farmList.length - farmsWithBoundary > 1 ? 's' : ''} without boundary — map them below
              </p>
            )}
          </div>
          <div style={{ height: 320 }}>
            <FarmMap farms={farmList} />
          </div>
        </div>
      )}

      {/* Farm list */}
      {farmList.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🌱</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>No farms registered yet</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4, marginBottom: 20 }}>
            Add your first farm to track boundaries, manage crops, and access market pricing.
          </p>
          <Link
            href="/farmer/farm/new"
            style={{ display: 'inline-block', padding: '11px 24px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            Register My First Farm →
          </Link>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {farmList.map((farm: any) => {
              const crops = (farm.crop_types ?? []) as string[];
              return (
                <div key={farm.id} style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    🌿
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{farm.name}</p>
                      {!farm.boundary && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#FEF3C7', color: '#D97706' }}>
                          NO BOUNDARY
                        </span>
                      )}
                      {farm.boundary && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#D1FAE5', color: '#059669' }}>
                          MAPPED
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: '0 0 6px' }}>
                      {farm.district ?? farm.location} · {farm.size_hectares ? `${farm.size_hectares} ha` : 'Size unknown'}
                    </p>
                    {crops.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {crops.slice(0, 4).map((c: string) => (
                          <span key={c} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#F0FDF4', color: C.greenMed, fontWeight: 600 }}>
                            {CROP_EMOJI[c] ?? '🌾'} {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/farmer/farm/new?edit=${farm.id}`}
                    style={{ fontSize: 12, color: C.greenMed, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                  >
                    {farm.boundary ? 'Edit' : 'Map →'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
