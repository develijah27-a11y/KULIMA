'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

interface Props {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  label: string;
  style: React.CSSProperties;
}

// Shared across every role's premium page — POSTs to /api/subscriptions,
// which debits the caller's wallet (or the group's pooled wallet for
// billedBy:'group' plans) atomically server-side. router.refresh() re-runs
// the server component so the "already subscribed" state updates without a
// full reload.
export function SubscribeButton({ planId, billingCycle, label, style }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to subscribe');
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={submit} disabled={loading} style={{ ...style, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Processing…' : label} {!loading && <ArrowRight size={16} strokeWidth={2.5} />}
      </button>
      {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: '8px 0 0', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}
