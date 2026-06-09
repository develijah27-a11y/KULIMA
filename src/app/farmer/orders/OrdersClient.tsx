'use client';

import { useState } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: '#1B4332', greenMed: '#40916C', greenBright: '#52B788',
  red: '#E63946', amber: '#D97706',
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#D97706', bg: '#FEF3C7', label: 'Pending' },
  countered: { color: '#7C3AED', bg: '#EDE9FE', label: 'Countered' },
  accepted:  { color: '#059669', bg: '#D1FAE5', label: 'Accepted' },
  rejected:  { color: '#DC2626', bg: '#FEF2F2', label: 'Rejected' },
  completed: { color: '#0284C7', bg: '#DBEAFE', label: 'Completed' },
};

const STATUS_TABS = ['all', 'pending', 'accepted', 'rejected', 'completed'] as const;

interface Offer {
  id: string;
  offered_price: number;
  status: string;
  message?: string;
  created_at: string;
  listing_id: string;
  listing: {
    id: string;
    crop_type: string;
    quantity_kg: number;
    asking_price: number;
    district: string;
  } | null;
}

interface CounterState { offerId: string; price: string; note: string }

export function OrdersClient({ offers: initial }: { offers: Offer[] }) {
  const [offers, setOffers]     = useState<Offer[]>(initial);
  const [tab, setTab]           = useState<typeof STATUS_TABS[number]>('all');
  const [loading, setLoading]   = useState<string | null>(null);
  const [counter, setCounter]   = useState<CounterState | null>(null);
  const [error, setError]       = useState('');

  const visible = tab === 'all' ? offers : offers.filter(o => o.status === tab);

  async function act(offerId: string, action: string, extra?: Record<string, string>) {
    setLoading(offerId + action);
    setError('');
    try {
      const res = await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offerId, action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error ?? 'Action failed'); return; }
      setOffers(prev => prev.map(o => {
        if (o.id !== offerId) {
          if (action === 'accept' && o.listing_id === offers.find(x => x.id === offerId)?.listing_id) {
            return { ...o, status: 'rejected' };
          }
          return o;
        }
        const nextStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : action === 'counter' ? 'countered' : o.status;
        return { ...o, status: nextStatus };
      }));
      setCounter(null);
    } finally {
      setLoading(null);
    }
  }

  const totalValue = offers.filter(o => o.status === 'accepted').reduce((s, o) => s + o.offered_price, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          My Orders
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Buyer offers on your listings</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Offers', value: offers.length, color: C.text },
          { label: 'Pending', value: offers.filter(o => o.status === 'pending').length, color: C.amber },
          { label: 'Accepted Value', value: `UGX ${Math.round(totalValue).toLocaleString()}`, color: C.greenMed, small: true },
        ].map(({ label, value, color, small }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
            <p className="font-black" style={{ color, letterSpacing: '-0.02em', fontSize: small ? 13 : 22 }}>{value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: C.muted }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize', background: tab === t ? C.green : 'var(--d-subtle)', color: tab === t ? '#fff' : C.muted }}>
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: C.red, fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* Counter modal */}
      {counter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.cardBg, borderRadius: 20, padding: 24, width: '100%', maxWidth: 480 }}>
            <p className="text-base font-bold mb-4" style={{ color: C.text }}>Counter Offer</p>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Your Counter Price (UGX)</label>
            <input
              type="number"
              value={counter.price}
              onChange={e => setCounter(c => c ? { ...c, price: e.target.value } : null)}
              placeholder="Enter amount"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Note (optional)</label>
            <textarea
              value={counter.note}
              onChange={e => setCounter(c => c ? { ...c, note: e.target.value } : null)}
              placeholder="Explain your counter price..."
              rows={2}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, marginBottom: 16, resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setCounter(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                disabled={!counter.price || loading === counter.offerId + 'counter'}
                onClick={() => act(counter.offerId, 'counter', { counterPrice: counter.price, farmerNote: counter.note })}
                style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !counter.price ? 0.5 : 1 }}>
                {loading === counter.offerId + 'counter' ? 'Sending…' : 'Send Counter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders list */}
      {visible.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>🛒</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No orders yet</p>
          <p style={{ color: C.muted, fontSize: 13 }}>Buyer offers will appear here once your listings are active.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {visible.map((offer, i) => {
            const st  = STATUS_CFG[offer.status] ?? STATUS_CFG.pending;
            const l   = offer.listing;
            const isPending = offer.status === 'pending';
            return (
              <div key={offer.id} style={{ padding: '16px 20px', borderBottom: i < visible.length - 1 ? `1px solid var(--d-border)` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: isPending ? 12 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                        {l?.crop_type ?? 'Unknown crop'} · {l?.quantity_kg ?? '?'} kg
                      </p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color, flexShrink: 0 }}>
                        {st.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>
                      {l?.district ?? '—'} · Asking: UGX {l ? Math.round(l.asking_price).toLocaleString() : '—'}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.greenMed, margin: 0 }}>
                      Offered: UGX {Math.round(offer.offered_price).toLocaleString()}
                    </p>
                    {offer.message && (
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>"{offer.message}"</p>
                    )}
                    <p style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                      {new Date(offer.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {isPending && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={loading === offer.id + 'reject'}
                      onClick={() => act(offer.id, 'reject')}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'transparent', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {loading === offer.id + 'reject' ? '…' : 'Decline'}
                    </button>
                    <button
                      onClick={() => setCounter({ offerId: offer.id, price: String(offer.offered_price), note: '' })}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Counter
                    </button>
                    <button
                      disabled={loading === offer.id + 'accept'}
                      onClick={() => act(offer.id, 'accept')}
                      style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {loading === offer.id + 'accept' ? '…' : '✓ Accept'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
