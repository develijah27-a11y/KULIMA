'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', green: '#1B4332' };

interface Props {
  offerId: string;
  amount: number;
  cropType: string;
  balance: number;
}

export function EscrowFundButton({ offerId, amount, cropType, balance }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const canFund = balance >= amount;

  async function fund() {
    if (!canFund) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/wallet/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fund', offerId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to fund escrow');
      setDone(true);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p style={{ color: '#059669', fontWeight: 700, fontSize: 12 }}>✓ Escrow funded — deal secured</p>;
  }

  return (
    <div>
      {!canFund && (
        <p style={{ color: '#D97706', fontSize: 11, marginBottom: 6 }}>
          Insufficient balance. Please deposit UGX {(amount - balance).toLocaleString()} more.
        </p>
      )}
      {error && <p style={{ color: '#DC2626', fontSize: 11, marginBottom: 6 }}>{error}</p>}
      <button
        onClick={fund}
        disabled={loading || !canFund}
        style={{
          width: '100%', padding: '10px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: canFund ? 'pointer' : 'not-allowed',
          background: loading || !canFund ? '#E5E7EB' : C.green,
          color: loading || !canFund ? C.muted : '#fff',
        }}
      >
        {loading ? '...' : `Fund Escrow — UGX ${amount.toLocaleString()}`}
      </button>
    </div>
  );
}
