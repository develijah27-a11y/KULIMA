'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: '#1B4332', amber: '#F4A261',
};

interface Props {
  listingId: string;
  askingPrice: number;
  marketPrice: number | null;
  existingOffer: { status: string; offered_price: number; counter_price?: number } | null;
}

export function MakeOfferForm({ listingId, askingPrice, marketPrice, existingOffer }: Props) {
  const router  = useRouter();
  const [price, setPrice]     = useState('');
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [acceptingCounter, setAcceptingCounter] = useState(false);

  const numPrice   = parseFloat(price);
  const minAllowed = Math.ceil(askingPrice * 0.7);
  const below70    = price && numPrice < minAllowed;
  const delta      = price && numPrice > 0 ? Math.round(((numPrice - askingPrice) / askingPrice) * 100) : null;

  async function submitOffer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!price || numPrice < minAllowed) { setError(`Minimum offer: UGX ${minAllowed.toLocaleString()}`); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, offeredPrice: numPrice, notes: notes || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to submit offer');
      setSuccess(true);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function acceptCounter() {
    setAcceptingCounter(true);
    try {
      const res  = await fetch('/api/offers/accept-counter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAcceptingCounter(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <p style={{ fontSize: 36, marginBottom: 8 }}>✅</p>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Offer Submitted!</p>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>The farmer will respond within 24–48 hours.</p>
      </div>
    );
  }

  // Existing offer states
  if (existingOffer) {
    const OFFER_CFG: Record<string, { color: string; bg: string; label: string }> = {
      pending:   { color: '#D97706', bg: '#FEF3C7', label: 'Under Review' },
      countered: { color: '#0284C7', bg: '#DBEAFE', label: 'Farmer Countered' },
      accepted:  { color: '#059669', bg: '#D1FAE5', label: 'Accepted!' },
      rejected:  { color: '#DC2626', bg: '#FEF2F2', label: 'Rejected' },
    };
    const cfg = OFFER_CFG[existingOffer.status] ?? OFFER_CFG.pending;

    return (
      <div>
        <div style={{ background: cfg.bg, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ color: cfg.color, fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>{cfg.label}</p>
          <p style={{ color: cfg.color, fontSize: 12, margin: 0 }}>
            Your offer: <strong>UGX {Math.round(existingOffer.offered_price).toLocaleString()}</strong>/kg
          </p>
        </div>

        {existingOffer.status === 'countered' && existingOffer.counter_price && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
              Farmer proposes: <strong style={{ color: C.text }}>UGX {Math.round(existingOffer.counter_price).toLocaleString()}/kg</strong>
            </p>
            {error && <p style={{ color: '#DC2626', fontSize: 12, marginBottom: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={acceptCounter}
                disabled={acceptingCounter}
                style={{ flex: 1, padding: '10px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {acceptingCounter ? '...' : `✓ Accept UGX ${Math.round(existingOffer.counter_price).toLocaleString()}`}
              </button>
              <button
                style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submitOffer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Price context */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>Asking Price</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
            UGX {askingPrice.toLocaleString()}
          </p>
        </div>
        {marketPrice && (
          <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 10, color: '#059669', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>Market Avg</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#059669', margin: 0, letterSpacing: '-0.02em' }}>
              UGX {marketPrice.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Your Offer (UGX per kg) *
        </label>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder={`Min: ${minAllowed.toLocaleString()}`}
          required
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 15, fontWeight: 600,
            border: `2px solid ${below70 ? '#FECACA' : price && !below70 ? '#A7F3D0' : C.border}`,
            color: C.text, outline: 'none', boxSizing: 'border-box', letterSpacing: '-0.01em',
          }}
        />
        {price && delta !== null && !below70 && (
          <p style={{ fontSize: 11, marginTop: 4, color: delta >= 0 ? '#059669' : '#D97706', fontWeight: 600 }}>
            {delta >= 0 ? `✓ +${delta}% above asking` : `${delta}% below asking — fair offer`}
          </p>
        )}
        {below70 && (
          <p style={{ fontSize: 11, marginTop: 4, color: '#DC2626', fontWeight: 600 }}>
            ⚠ Below minimum — must be at least UGX {minAllowed.toLocaleString()}
          </p>
        )}
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Message to Farmer <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Introduce yourself, ask about delivery, quality, etc..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
          <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !!below70}
        style={{
          padding: '13px', background: (loading || below70) ? '#E5E7EB' : C.green,
          color: (loading || below70) ? C.muted : '#fff',
          border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15,
          cursor: (loading || below70) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Submitting...' : 'Submit Offer →'}
      </button>
    </form>
  );
}
