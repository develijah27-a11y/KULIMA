import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const CATEGORY_EMOJI: Record<string, string> = {
  seed: '🌱', fertiliser: '🧪', pesticide: '🪣', tool: '🔧', equipment: '⚙️', other: '📦',
};

export default async function FlashDealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/auth/signin');

  const { data: products } = await (supabase.from as any)('supplier_products')
    .select('id, name, category, price_per_unit, unit, stock_qty, min_order_qty, district, is_available, created_at')
    .eq('supplier_id', profile.id)
    .eq('is_available', true)
    .order('created_at', { ascending: false })
    .limit(20);

  const rows = (products ?? []) as any[];

  // Products with stock > min_order_qty * 3 are good flash deal candidates
  const flashCandidates = rows.filter(p => (p.stock_qty ?? 0) >= ((p.min_order_qty ?? 1) * 3));
  const lowStock = rows.filter(p => (p.stock_qty ?? 0) < ((p.min_order_qty ?? 1) * 3) && p.stock_qty > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Flash Deals
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Promote your products with time-limited discounts to move stock fast</p>
      </div>

      {/* Coming soon header card */}
      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 16, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 36, flexShrink: 0 }}>⚡</span>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 5px' }}>Flash Deal Campaigns — Coming Soon</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
            Set a discount and duration. Farmers near you see your deal highlighted at the top of the marketplace for up to 48 hours.
          </p>
        </div>
      </div>

      {/* Flash deal candidates — high-stock products */}
      {flashCandidates.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Ready to Flash</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>High-stock products — ideal for a flash deal to move units</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.green }}>
              {flashCandidates.length} products
            </span>
          </div>
          {flashCandidates.map((p: any, i: number) => {
            const emoji = CATEGORY_EMOJI[p.category?.toLowerCase()] ?? '📦';
            return (
              <div key={p.id} style={{ padding: '14px 18px', borderBottom: i < flashCandidates.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    UGX {Number(p.price_per_unit).toLocaleString()}/{p.unit} · {p.stock_qty} in stock
                    {p.district && ` · ${p.district}`}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: 'var(--color-sky-bg)', color: 'var(--color-sky)', display: 'block', marginBottom: 4 }}>
                    Flash Ready
                  </span>
                  <Link href="/supplier/catalogue"
                    style={{ fontSize: 11, color: C.green, fontWeight: 700, textDecoration: 'none' }}>
                    Edit →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Low stock products */}
      {lowStock.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Lower Stock Products</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Restock before running a flash deal on these</p>
          </div>
          {lowStock.map((p: any, i: number) => {
            const emoji = CATEGORY_EMOJI[p.category?.toLowerCase()] ?? '📦';
            return (
              <div key={p.id} style={{ padding: '12px 18px', borderBottom: i < lowStock.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 10, alignItems: 'center', opacity: 0.75 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 1px' }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    {p.stock_qty} left · UGX {Number(p.price_per_unit).toLocaleString()}/{p.unit}
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)' }}>
                  Low Stock
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>⚡</p>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>No products listed yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Add products to your catalogue first, then run flash deals to move stock fast.</p>
          <Link href="/supplier/catalogue"
            style={{ display: 'inline-block', padding: '10px 20px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Add Products →
          </Link>
        </div>
      )}

      {/* Catalogue link */}
      {rows.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>Keep your catalogue updated</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Accurate stock and pricing increase visibility even without a flash deal.</p>
          </div>
          <Link href="/supplier/catalogue"
            style={{ padding: '9px 16px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, marginLeft: 12 }}>
            Catalogue →
          </Link>
        </div>
      )}
    </div>
  );
}
