'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const C = { text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB', green: '#1B4332' };

interface Props {
  deliveryId: string;
  vehicle: { id: string; plate_number: string; vehicle_type: string; capacity_kg: number };
}

export function BidForm({ deliveryId, vehicle }: Props) {
  const router = useRouter();
  const [price, setPrice]     = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = parseFloat(price);
    if (!n || n < 1000) { setError('Minimum bid is UGX 1,000'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/deliveries/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_id: deliveryId, vehicle_id: vehicle.id, price: n, message: message || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Submit a Bid</p>

      <div style={{ padding: '10px 14px', background: '#F9FAFB', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px', fontWeight: 600 }}>YOUR VEHICLE</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
          {vehicle.plate_number} · {vehicle.vehicle_type} · {vehicle.capacity_kg} kg capacity
        </p>
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Your Price (UGX) *
        </label>
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Min: 1,000" min="1000"
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box', letterSpacing: '-0.01em' }} />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Message <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell the requester about your experience, route knowledge..."
          rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>

      {error && <p style={{ color: '#DC2626', fontSize: 12 }}>{error}</p>}

      <button type="submit" disabled={loading}
        style={{ padding: '12px', background: loading ? '#E5E7EB' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Submitting...' : 'Submit Bid →'}
      </button>
    </form>
  );
}
