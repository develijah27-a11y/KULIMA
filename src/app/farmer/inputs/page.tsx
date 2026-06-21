'use client';

import { useState, useEffect } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  confirmed: { label: 'Confirmed', color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)'     },
  delivered: { label: 'Delivered', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

const CAT_ICON: Record<string, string> = {
  seeds: '🌱', fertilizers: '🌿', pesticides: '🧪', tools: '🔧', equipment: '⚙️', other: '📦',
};

type Order = {
  id: string;
  product_name: string;
  category?: string;
  quantity: number;
  unit: string;
  amount?: number;
  status: string;
  notes?: string;
  created_at: string;
};

type ReturnReq = { order_id: string; status: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FarmerInputsPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'active' | 'delivered' | 'all'>('active');

  // Return modal state
  const [retModal, setRetModal]   = useState<Order | null>(null);
  const [retReason, setRetReason] = useState('');
  const [retQty, setRetQty]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retError, setRetError]   = useState('');
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/supplier-orders?role=farmer').then(r => r.json()),
      fetch('/api/supplier-orders/returns?role=farmer').then(r => r.json()),
    ]).then(([ord, ret]) => {
      setOrders(ord.orders ?? []);
      setReturns((ret.returns ?? []).map((r: any) => ({ order_id: r.order_id, status: r.status })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const submitReturn = async () => {
    if (!retModal || !retReason.trim()) { setRetError('Please describe the reason for return.'); return; }
    setSubmitting(true);
    setRetError('');
    const res = await fetch('/api/supplier-orders/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: retModal.id,
        reason:   retReason.trim(),
        quantity_returned: retQty ? Number(retQty) : retModal.quantity,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRetError(data.error ?? 'Failed to submit return request.');
    } else {
      setReturns(prev => [...prev, { order_id: retModal.id, status: 'pending' }]);
      setRetModal(null);
      setRetReason('');
      setRetQty('');
      showToast('Return request submitted. The supplier will respond shortly.', true);
    }
    setSubmitting(false);
  };

  const filtered = orders.filter(o => {
    if (tab === 'active')    return ['pending','confirmed'].includes(o.status);
    if (tab === 'delivered') return o.status === 'delivered';
    return true;
  });

  const returnStatusFor = (orderId: string) => returns.find(r => r.order_id === orderId);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, minWidth: 260, background: toast.ok ? '#065F46' : '#991B1B', color: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{toast.ok ? '✅ ' : '❌ '}{toast.msg}</p>
        </div>
      )}

      {/* Return modal */}
      {retModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.cardBg, borderRadius: 20, padding: '28px 28px', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>Request Return</p>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 18px' }}>{retModal.product_name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Reason for return *</label>
                <textarea
                  value={retReason}
                  onChange={e => setRetReason(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue — e.g. damaged packaging, wrong product, poor germination rate…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
                  Quantity to return ({retModal.unit}) <span style={{ fontWeight: 400, color: C.muted }}>— leave blank for full {retModal.quantity} {retModal.unit}</span>
                </label>
                <input
                  type="number"
                  value={retQty}
                  onChange={e => setRetQty(e.target.value)}
                  min="1"
                  max={retModal.quantity}
                  placeholder={String(retModal.quantity)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {retError && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{retError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => { setRetModal(null); setRetReason(''); setRetQty(''); setRetError(''); }}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitReturn}
                  disabled={submitting || !retReason.trim()}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, background: submitting || !retReason.trim() ? 'var(--d-border)' : 'var(--color-danger)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Submitting…' : 'Submit Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>My Inputs 🌱</h1>
        <p style={{ fontSize: 13, color: C.muted }}>Farm inputs ordered from suppliers</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Active',    count: orders.filter(o => ['pending','confirmed'].includes(o.status)).length, color: 'var(--color-sky)' },
          { label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length,                  color: 'var(--color-success)' },
          { label: 'Returns',   count: returns.length,                                                       color: 'var(--color-danger)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{count}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {(['active','delivered','all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent',
            color: tab === t ? C.greenMed : C.muted,
            borderBottom: tab === t ? `2px solid ${C.greenMed}` : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow }}>
        {loading ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted, fontSize: 14 }}>Loading your inputs…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🌱</p>
            <p style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>No {tab !== 'all' ? tab : ''} input orders</p>
            <p style={{ fontSize: 13, color: C.muted }}>
              Browse the supplier catalogue to order seeds, fertilizers, and other farm inputs.
            </p>
          </div>
        ) : (
          filtered.map((order, i) => {
            const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
            const icon = CAT_ICON[order.category ?? ''] ?? '📦';
            const existingReturn = returnStatusFor(order.id);
            const canReturn = order.status === 'delivered' && !existingReturn;

            return (
              <div key={order.id} style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontWeight: 700, color: C.text, fontSize: 14, margin: 0 }}>{order.product_name}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>
                      {order.quantity} {order.unit}
                      {order.amount ? ` · UGX ${order.amount.toLocaleString()}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{fmt(order.created_at)}</p>
                    {existingReturn && (
                      <p style={{ fontSize: 11, margin: '4px 0 0', fontWeight: 600, color: existingReturn.status === 'approved' ? 'var(--color-success)' : existingReturn.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-harvest)' }}>
                        Return: {existingReturn.status === 'pending' ? 'Awaiting supplier response' : existingReturn.status}
                      </p>
                    )}
                  </div>
                  {canReturn && (
                    <button
                      onClick={() => { setRetModal(order); setRetError(''); }}
                      style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                    >
                      Request Return
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
