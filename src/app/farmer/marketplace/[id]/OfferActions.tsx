'use client';

import { useState, useTransition } from 'react';

const C = { border: 'var(--d-border)', muted: 'var(--d-muted)', green: '#1B4332' };

interface Props {
  offerId: string;
  askingPrice: number;
  offeredPrice: number;
  onDone: () => void;
}

export function OfferActions({ offerId, askingPrice, offeredPrice, onDone }: Props) {
  const [mode, setMode]             = useState<'idle' | 'counter' | 'reject'>('idle');
  const [counterPrice, setCounter]  = useState('');
  const [farmerNote, setNote]       = useState('');
  const [isPending, startTransition] = useTransition();
  const [err, setErr]               = useState('');

  async function act(action: string, extra: object = {}) {
    setErr('');
    const res = await fetch('/api/offers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: offerId, action, ...extra }),
    });
    const json = await res.json();
    if (!json.success) { setErr(json.error ?? 'Failed'); return; }
    onDone();
  }

  if (mode === 'counter') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <input
          type="number"
          value={counterPrice}
          onChange={e => setCounter(e.target.value)}
          placeholder={`Your price (asking: ${askingPrice.toLocaleString()})`}
          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
        />
        <input
          value={farmerNote}
          onChange={e => setNote(e.target.value)}
          placeholder="Message to buyer (optional)"
          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
        />
        {err && <p style={{ color: '#DC2626', fontSize: 11 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            disabled={isPending || !counterPrice}
            onClick={() => startTransition(() => act('counter', { counterPrice: parseFloat(counterPrice), farmerNote: farmerNote || undefined }))}
            style={{ flex: 1, padding: '8px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: counterPrice ? 'pointer' : 'not-allowed' }}
          >
            {isPending ? '...' : 'Send Counter'}
          </button>
          <button
            onClick={() => { setMode('idle'); setCounter(''); setNote(''); }}
            style={{ padding: '8px 12px', background: '#F3F4F6', color: C.muted, border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
          >Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === 'reject') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <input
          value={farmerNote}
          onChange={e => setNote(e.target.value)}
          placeholder="Reason for rejection (optional)"
          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
        />
        {err && <p style={{ color: '#DC2626', fontSize: 11 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => act('reject', { farmerNote: farmerNote || undefined }))}
            style={{ flex: 1, padding: '8px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            {isPending ? '...' : 'Confirm Reject'}
          </button>
          <button
            onClick={() => { setMode('idle'); setNote(''); }}
            style={{ padding: '8px 12px', background: '#F3F4F6', color: C.muted, border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
          >Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
      {err && <p style={{ width: '100%', color: '#DC2626', fontSize: 11, margin: 0 }}>{err}</p>}
      <button
        disabled={isPending}
        onClick={() => startTransition(() => act('accept'))}
        style={{ padding: '7px 14px', background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
      >
        ✓ Accept UGX {offeredPrice.toLocaleString()}
      </button>
      <button
        onClick={() => setMode('counter')}
        disabled={isPending}
        style={{ padding: '7px 14px', background: '#DBEAFE', color: '#0284C7', border: '1px solid #BFDBFE', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
      >
        ↕ Counter
      </button>
      <button
        onClick={() => setMode('reject')}
        disabled={isPending}
        style={{ padding: '7px 14px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
      >
        ✗ Reject
      </button>
    </div>
  );
}
