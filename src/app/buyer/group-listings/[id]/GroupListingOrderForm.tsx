'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

interface Props {
  listingId: string;
  cropType: string;
  maxKg: number;
  pricePerKg: number;
  district: string;
}

export function GroupListingOrderForm({ listingId, cropType, maxKg, pricePerKg, district }: Props) {
  const router = useRouter();
  const [qty, setQty]   = useState(Math.min(100, maxKg));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, startT] = useTransition();

  const total = Math.round(qty * pricePerKg);

  const place = () => {
    setError('');
    if (qty <= 0 || qty > maxKg) { setError(`Quantity must be between 1 and ${maxKg} kg`); return; }
    startT(async () => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupListingId: listingId, quantityKg: qty, note: note || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to place order. Please try again.'); return; }
      router.push('/buyer/orders');
    });
  };

  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '22px 24px' }}>
      <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
        Place Bulk Order
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Quantity */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Quantity (kg) <span style={{ fontWeight: 400, color: C.muted }}>· max {maxKg.toLocaleString()} kg</span>
          </label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            min={1}
            max={maxKg}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 15, fontWeight: 600, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Note */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Note <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Delivery instructions, preferred date, quality requirements…"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Price summary */}
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--d-page)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: `${qty.toLocaleString()} kg × UGX ${Math.round(pricePerKg).toLocaleString()}`, value: `UGX ${total.toLocaleString()}` },
            { label: 'Escrow deposit required', value: `UGX ${total.toLocaleString()}` },
            { label: 'Pickup / collection in', value: district },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>{value}</p>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Total</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: C.greenMed, margin: 0, letterSpacing: '-0.01em' }}>UGX {total.toLocaleString()}</p>
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>{error}</p>}

        <button
          onClick={place}
          disabled={pending || qty <= 0 || qty > maxKg}
          style={{
            padding: '13px',
            background: pending || qty <= 0 || qty > maxKg ? 'var(--d-border)' : C.greenMed,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 15,
            cursor: pending ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          {pending ? 'Placing Order…' : `Confirm Order · UGX ${total.toLocaleString()}`}
        </button>

        <p style={{ fontSize: 11, color: C.muted, margin: 0, textAlign: 'center' }}>
          Funds held in escrow · released to group only after delivery confirmation
        </p>
      </div>
    </div>
  );
}
