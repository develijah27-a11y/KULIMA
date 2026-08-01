'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to cancel');
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-muted)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--d-muted)', fontWeight: 600 }}>
        Stays active until the end of your billing period. Cancel?
      </span>
      <button
        onClick={submit}
        disabled={loading}
        style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: 'var(--color-danger)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Cancelling…' : 'Yes, cancel'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={loading}
        style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        Never mind
      </button>
      {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0, fontWeight: 600, width: '100%' }}>{error}</p>}
    </div>
  );
}
