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

const TABS = ['all', 'pending', 'confirmed', 'delivered', 'cancelled'] as const;

type Order = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  status: string;
  buyer_name?: string;
  district?: string;
  total_price?: number;
  notes?: string;
  created_at: string;
};

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/supplier-orders${tab !== 'all' ? `?status=${tab}` : ''}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    setError('');
    const res = await fetch('/api/supplier-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setUpdating(null); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setUpdating(null);
  };

  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab);
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Incoming Orders
        </h1>
        <p style={{ fontSize: 13, color: C.muted }}>
          {pendingCount > 0 ? `${pendingCount} order${pendingCount !== 1 ? 's' : ''} awaiting your response` : 'All orders from buyers and farmers'}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['pending', 'confirmed', 'delivered', 'cancelled'] as const).map(s => {
          const count = orders.filter(o => o.status === s).length;
          const cfg = STATUS_CFG[s];
          return (
            <button key={s} onClick={() => setTab(s)}
              style={{ background: tab === s ? cfg.bg : C.cardBg, border: `1px solid ${tab === s ? cfg.color : C.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: tab === s ? cfg.color : C.text }}>{count}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: tab === s ? cfg.color : C.muted, textTransform: 'capitalize' }}>{s}</p>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: '8px 8px 0 0',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t ? C.cardBg : 'transparent',
              color: tab === t ? C.greenMed : C.muted,
              borderBottom: tab === t ? `2px solid ${C.greenMed}` : '2px solid transparent',
            }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--color-harvest)', color: '#fff', borderRadius: 99, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>
      )}

      {/* Orders list */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: C.muted, fontSize: 14 }}>Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div>
            <p style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>No {tab !== 'all' ? tab : ''} orders</p>
            <p style={{ fontSize: 13, color: C.muted }}>Orders from buyers will appear here</p>
          </div>
        ) : (
          <div>
            {filtered.map((order, i) => {
              const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
              const isLast = i === filtered.length - 1;
              return (
                <div key={order.id} style={{ padding: '16px 20px', borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5h13l-5-5V3"/></svg>
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 2 }}>{order.product_name}</p>
                        <p style={{ fontSize: 12, color: C.muted }}>
                          {order.quantity} {order.unit}
                          {order.total_price ? ` · UGX ${order.total_price.toLocaleString()}` : ''}
                          {order.buyer_name ? ` · ${order.buyer_name}` : ''}
                          {order.district ? ` · ${order.district}` : ''}
                        </p>
                        {order.notes && (
                          <p style={{ fontSize: 11, color: C.muted, marginTop: 2, fontStyle: 'italic' }}>{order.notes}</p>
                        )}
                        <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {order.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            disabled={updating === order.id}
                            onClick={() => updateStatus(order.id, 'confirmed')}
                            style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--color-sky-bg)', color: 'var(--color-sky)', border: 'none', cursor: 'pointer' }}>
                            Confirm
                          </button>
                          <button
                            disabled={updating === order.id}
                            onClick={() => updateStatus(order.id, 'cancelled')}
                            style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}>
                            Decline
                          </button>
                        </div>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          disabled={updating === order.id}
                          onClick={() => updateStatus(order.id, 'delivered')}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'none', cursor: 'pointer' }}>
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
