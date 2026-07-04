import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const CROP_COLOR: Record<string, string> = { maize: 'var(--color-harvest)', coffee: '#7C3AED', beans: 'var(--color-danger)', rice: 'var(--color-sky)', banana: 'var(--color-harvest)', cassava: 'var(--color-success)', tomato: 'var(--color-danger)' };

export default async function SupplyPipelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: listings } = await (supabase.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, created_at, verification_level')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(60);

  const rows = (listings ?? []) as any[];

  // Group by crop for summary
  const byCrop: Record<string, { count: number; totalQty: number; avgPrice: number }> = {};
  rows.forEach((l: any) => {
    const k = l.crop_type?.toLowerCase() ?? 'other';
    if (!byCrop[k]) byCrop[k] = { count: 0, totalQty: 0, avgPrice: 0 };
    byCrop[k].count++;
    byCrop[k].totalQty += l.quantity_kg ?? 0;
    byCrop[k].avgPrice = ((byCrop[k].avgPrice * (byCrop[k].count - 1)) + (l.asking_price ?? 0)) / byCrop[k].count;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Find Farmers</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{rows.length} farmers ready to sell</p>
        </div>
        <Link href="/offtaker/pipeline/new" style={{ padding: '8px 16px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + New Deal
        </Link>
      </div>

      {/* Summary by crop */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {Object.entries(byCrop).slice(0, 6).map(([crop, data]) => {
          const color = CROP_COLOR[crop] ?? C.greenMed;
          return (
            <div key={crop} style={{ flexShrink: 0, background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '12px 16px', minWidth: 120 }}>
              <div style={{ marginBottom: 4 }}><Leaf size={20} style={{ color: getCropColor(crop) }} /></div>
              <p style={{ fontSize: 12, fontWeight: 800, color, margin: '0 0 2px', textTransform: 'capitalize' }}>{crop}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{data.count} farms · {(data.totalQty / 1000).toFixed(1)}t</p>
            </div>
          );
        })}
      </div>

      {/* Listings */}
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Leaf size={40} style={{ color: C.muted }} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No active listings</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Check back soon — farmers are adding new produce listings daily.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>Available Supply</p>
          </div>
          {rows.map((l: any, i: number) => {
            const k = l.crop_type?.toLowerCase() ?? '';
            const color = CROP_COLOR[k] ?? C.greenMed;
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Leaf size={20} style={{ color: getCropColor(l.crop_type) }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{l.crop_type}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{(l.quantity_kg ?? 0).toLocaleString()} kg · {l.district}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color, margin: '0 0 4px', letterSpacing: '-0.02em' }}>UGX {Math.round(l.asking_price ?? 0).toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>per kg</p>
                </div>
                <Link href="/offtaker/pipeline/new" style={{ padding: '6px 14px', background: 'var(--color-primary-bg)', color: C.greenMed, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                  Contract →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
