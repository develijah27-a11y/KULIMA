import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Leaf, Inbox } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)',
};


export default async function BuyerRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [{ data: active }, { data: recentListings }] = await Promise.all([
    (supabase.from as any)('offers')
      .select(`
        id, offered_price, counter_price, status, message, farmer_note, created_at,
        listing:listings(id, crop_type, quantity_kg, asking_price, district, farmer_id)
      `)
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'countered'])
      .order('created_at', { ascending: false })
      .limit(50),
    (supabase.from as any)('listings')
      .select('id, crop_type, quantity_kg, asking_price, district, quality_grade, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const rows = (active ?? []) as any[];
  const listings = (recentListings ?? []) as any[];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Requests
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Active negotiations and purchase requests</p>
        </div>
        <Link href="/buyer/listings" style={{ padding: '9px 16px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + New Request
        </Link>
      </div>

      {/* Active negotiations */}
      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Inbox size={48} style={{ color: C.muted }} /></div>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>No active requests</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Browse listings and make an offer — your active negotiations appear here</p>
          <Link href="/buyer/listings" style={{ display: 'inline-block', padding: '11px 22px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Browse Listings →
          </Link>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Active Negotiations</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)' }}>{rows.length}</span>
          </div>
          {rows.map((o: any, i: number) => {
            const crop  = o.listing?.crop_type ?? 'Produce';
            const isCountered = o.status === 'countered';
            return (
              <div key={o.id} style={{ padding: '15px 18px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Leaf size={16} style={{ color: getCropColor(o.listing?.crop_type) }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop}</p>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, flexShrink: 0,
                      background: isCountered ? 'var(--color-sky-bg)' : 'var(--color-harvest-bg)',
                      color: isCountered ? 'var(--color-sky)' : 'var(--color-harvest)',
                    }}>
                      {isCountered ? 'Farmer Countered' : 'Awaiting Response'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 3px' }}>
                    {o.listing?.quantity_kg} kg · {o.listing?.district}
                  </p>
                  <p style={{ fontSize: 12, color: C.text, margin: 0 }}>
                    Your offer: <strong>UGX {Number(o.offered_price).toLocaleString()}</strong>
                    {isCountered && o.counter_price && (
                      <> · Farmer counter: <strong style={{ color: 'var(--color-sky)' }}>UGX {Number(o.counter_price).toLocaleString()}</strong></>
                    )}
                  </p>
                  {isCountered && o.farmer_note && (
                    <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', padding: '6px 10px', background: 'var(--color-sky-bg)', borderRadius: 8 }}>
                      {o.farmer_note}
                    </p>
                  )}
                </div>
                <Link href={`/buyer/offers`} style={{ fontSize: 11, fontWeight: 700, color: C.green, textDecoration: 'none', flexShrink: 0, marginTop: 2 }}>
                  Respond →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Discover section */}
      {listings.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>New Listings — Make an Offer</p>
          </div>
          {listings.slice(0, 5).map((l: any, i: number) => {
            const crop  = l.crop_type ?? 'Produce';
            return (
              <div key={l.id} style={{ padding: '13px 18px', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Leaf size={18} style={{ color: getCropColor(l.crop_type), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 1px', textTransform: 'capitalize' }}>{crop}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{l.quantity_kg} kg · {l.district} · UGX {Number(l.asking_price).toLocaleString()}/kg</p>
                </div>
                <Link href={`/buyer/listings/${l.id}`} style={{ padding: '5px 12px', background: 'var(--color-primary-bg)', color: C.green, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                  View →
                </Link>
              </div>
            );
          })}
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.border}` }}>
            <Link href="/buyer/listings" style={{ fontSize: 13, fontWeight: 700, color: C.green, textDecoration: 'none' }}>
              See all listings →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
