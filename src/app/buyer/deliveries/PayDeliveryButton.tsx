'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  deliveryId: string;
  amount: number;
}

export function PayDeliveryButton({ deliveryId, amount }: Props) {
  const router  = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [confirm, setConfirm]   = useState(false);

  async function pay() {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/deliveries/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_id: deliveryId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Payment failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        style={{
          padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}
      >
        Pay UGX {amount.toLocaleString()}
      </button>
    );
  }

  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--d-text)', margin: 0, textAlign: 'right' }}>
        Confirm payment of<br />
        <strong>UGX {amount.toLocaleString()}</strong>?
      </p>
      {error && <p style={{ fontSize: 10, color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setConfirm(false)} disabled={loading}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={pay} disabled={loading}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: loading ? 'var(--color-surface-2)' : '#7C3AED', color: loading ? 'var(--d-muted)' : '#fff', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Paying…' : 'Confirm Pay'}
        </button>
      </div>
    </div>
  );
}
