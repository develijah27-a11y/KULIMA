'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  productId: string;
  productName: string;
  unit: string;
  minOrderQty: number;
  stockQty: number;
  pricePerUnit: number;
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', cardBg: 'var(--d-card)',
};

export function BuyProductButton({ productId, productName, unit, minOrderQty, stockQty, pricePerUnit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(minOrderQty));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    const qty = Number(quantity);
    if (!qty || qty <= 0) { setError('Enter a valid quantity'); return; }
    if (qty < minOrderQty) { setError(`Minimum order is ${minOrderQty} ${unit}`); return; }
    if (qty > stockQty) { setError(`Only ${stockQty} ${unit} in stock`); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/supplier-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: qty, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to place order');
      setDone(true);
      router.refresh();
      setTimeout(() => { setOpen(false); setDone(false); }, 2000);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const total = Math.round((Number(quantity) || 0) * pricePerUnit);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ width: '100%', padding: '10px', borderRadius: 10, background: C.green, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
      >
        Order Now
      </button>

      {open && (
        <div
          onClick={() => !loading && setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: C.cardBg, borderRadius: 20, padding: 26, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><CheckCircle2 size={44} style={{ color: 'var(--color-success)' }} /></div>
                <p style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Order placed!</p>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>The supplier has been notified.</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>Order {productName}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 18px' }}>UGX {pricePerUnit.toLocaleString()} per {unit} · {stockQty} {unit} in stock</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
                      Quantity ({unit})
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      min={minOrderQty}
                      max={stockQty}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
                      Notes <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Delivery instructions, preferred date, etc."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--color-primary-bg)', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Total</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)' }}>UGX {total.toLocaleString()}</span>
                  </div>
                  {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                      onClick={() => setOpen(false)}
                      disabled={loading}
                      style={{ flex: 1, padding: '11px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      disabled={loading}
                      style={{ flex: 1, padding: '11px', borderRadius: 12, background: loading ? 'var(--d-border)' : C.green, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                      {loading ? 'Placing…' : 'Confirm Order'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
