'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', greenMed: 'var(--color-primary-hover)',
};

function NewBulkOrderForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const productId   = sp.get('productId') ?? '';
  const productName = sp.get('name') ?? '';
  const unit        = sp.get('unit') ?? 'unit';
  const price       = Number(sp.get('price') ?? 0);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/groups/my-members').then(r => r.json()).then(json => setGroupId(json.groupId ?? null)).catch(() => {});
  }, []);

  const estimate = quantity ? Math.round(Number(quantity) * price) : 0;

  async function submit() {
    if (!groupId) { setError('Could not find your group.'); return; }
    if (!quantity || Number(quantity) <= 0) { setError('Enter a valid quantity'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/groups/${groupId}/bulk-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, requestedQuantity: Number(quantity), notes: notes || undefined }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to submit request');
      router.push('/groups/bulk-orders');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!productId) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <p style={{ color: C.muted, fontSize: 14 }}>Pick a product first from Order Inputs.</p>
        <Link href="/groups/suppliers" style={{ color: C.greenMed, fontWeight: 700, textDecoration: 'none' }}>← Order Inputs</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/groups/suppliers" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Order Inputs</Link>
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>Request Bulk Discount</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>{productName} — the dealer reviews your quantity and names their own discounted price.</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Quantity Needed ({unit}) *
          </label>
          <input
            type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
            placeholder={`e.g. 500 ${unit}`}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
          />
          {estimate > 0 && (
            <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              Catalogue estimate: UGX {estimate.toLocaleString()} — the dealer's actual quote may be lower.
            </p>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Notes <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span>
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Delivery timeline, packaging preference, payment terms..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <button onClick={submit} disabled={loading} style={{ padding: '12px', background: loading ? 'var(--color-surface-2)' : C.greenMed, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Submitting…' : 'Send Bulk Order Request →'}
        </button>
      </div>
    </div>
  );
}

export default function NewBulkOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewBulkOrderForm />
    </Suspense>
  );
}
