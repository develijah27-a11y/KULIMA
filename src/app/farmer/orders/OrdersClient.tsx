'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  red: 'var(--color-danger)', redBg: 'var(--color-danger-bg)',
  blue: 'var(--color-sky)', blueBg: 'var(--color-sky-bg)',
  purple: '#7C3AED', purpleBg: '#EDE9FE',
};

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
  sweet_potatoes: '🍠', sunflower: '🌻', cotton: '🏵️',
};

type Order = {
  id: string;
  crop_type: string;
  quantity_kg: number;
  unit_price: number;
  total_amount: number;
  status: string;
  buyer_note: string | null;
  farmer_note: string | null;
  pickup_district: string | null;
  dropoff_district: string | null;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  buyer?: { full_name: string; location: string } | null;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'New Order',    color: C.amber,  bg: C.amberBg  },
  confirmed:  { label: 'Confirmed',    color: C.blue,   bg: C.blueBg   },
  dispatched: { label: 'Driver Sent',  color: C.purple, bg: C.purpleBg },
  in_transit: { label: 'On the Way',   color: C.green,  bg: C.greenBg  },
  delivered:  { label: 'Delivered',    color: C.green,  bg: C.greenBg  },
  completed:  { label: 'Paid ✓',       color: C.green,  bg: C.greenBg  },
  cancelled:  { label: 'Cancelled',    color: C.red,    bg: C.redBg    },
};

const TABS = [
  { label: 'New',      filter: ['pending'] },
  { label: 'Active',   filter: ['confirmed','dispatched','in_transit'] },
  { label: 'Delivered',filter: ['delivered'] },
  { label: 'Done',     filter: ['completed'] },
  { label: 'All',      filter: null },
];

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 260, background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ok ? '✅ ' : '❌ '}{msg}</p>
    </div>
  );
}

function OrderCard({ order, onAction }: { order: Order; onAction: (id: string, next: string) => void }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote]         = useState('');
  const [pending, startT]       = useTransition();
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const cfg    = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
  const emoji  = CROP_EMOJI[order.crop_type?.toLowerCase()] ?? '🌿';
  const buyer  = order.buyer;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function doAction(action: string) {
    startT(async () => {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        const nextStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
        showToast(action === 'confirm' ? 'Order confirmed! Driver will be assigned.' : 'Order cancelled.', true);
        setShowNote(false);
        onAction(order.id, nextStatus);
      } else {
        showToast(json.error ?? 'Action failed', false);
      }
    });
  }

  return (
    <div style={{
      background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden',
      border: order.status === 'pending' ? `1.5px solid ${C.amber}` : `1px solid transparent`,
      marginBottom: 14,
    }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Crop icon */}
          <div style={{ width: 46, height: 46, borderRadius: 14, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
                {order.crop_type}
              </p>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
              {order.quantity_kg} kg
              {buyer?.full_name ? ` · ${buyer.full_name}` : ''}
              {order.dropoff_district ? ` → ${order.dropoff_district}` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
              UGX {Math.round(order.total_amount).toLocaleString()}
            </p>
            <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>
              {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        {/* Unit price breakdown */}
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: C.muted }}>UGX {Math.round(order.unit_price).toLocaleString()}/kg</span>
          <span style={{ fontSize: 11, color: C.muted }}>× {order.quantity_kg} kg</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>= UGX {Math.round(order.total_amount).toLocaleString()}</span>
        </div>

        {order.buyer_note && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: C.amberBg, borderRadius: 10 }}>
            <p style={{ fontSize: 11, color: C.amber, margin: 0 }}>
              <strong>Buyer note:</strong> {order.buyer_note}
            </p>
          </div>
        )}
      </div>

      {/* Note field (when confirming or cancelling) */}
      {showNote && (
        <div style={{ padding: '0 20px 12px', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: '12px 0 6px' }}>
            Note to buyer (optional)
          </p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Will be ready for pickup on Monday..."
            rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
      )}

      {/* Actions — only for pending orders */}
      {order.status === 'pending' && (
        <div style={{ padding: '0 20px 18px', display: 'flex', gap: 10 }}>
          {!showNote ? (
            <>
              <button
                onClick={() => { setShowNote(true); }}
                style={{ flex: 1, padding: '12px', background: C.green, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}
              >
                ✅ Confirm Order
              </button>
              <button
                onClick={() => doAction('cancel')}
                disabled={pending}
                style={{ padding: '12px 16px', background: C.redBg, color: C.red, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', gap: 8 }}>
              <button
                onClick={() => doAction('confirm')}
                disabled={pending}
                style={{ flex: 1, padding: '12px', background: pending ? C.greenBg : C.green, color: pending ? C.green : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {pending ? '⏳ Confirming…' : '✅ Confirm & Notify Buyer'}
              </button>
              <button onClick={() => { setShowNote(false); setNote(''); }} style={{ padding: '12px 14px', background: 'var(--color-surface-2)', color: C.muted, border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status timeline for non-pending */}
      {order.status !== 'pending' && order.status !== 'cancelled' && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
            {[
              { label: 'Confirmed',  ts: order.confirmed_at,  icon: '✅' },
              { label: 'Dispatched', ts: order.dispatched_at, icon: '🚛' },
              { label: 'Delivered',  ts: order.delivered_at,  icon: '📦' },
              { label: 'Paid',       ts: order.completed_at,  icon: '💰' },
            ].map(s => (
              <div key={s.label} style={{ flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.ts ? C.green : 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, margin: '0 auto 4px' }}>
                  {s.ts ? <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span> : <span>{s.icon}</span>}
                </div>
                <p style={{ fontSize: 9, color: s.ts ? C.greenMed : C.muted, textAlign: 'center', margin: 0, fontWeight: s.ts ? 700 : 400 }}>{s.label}</p>
                {s.ts && <p style={{ fontSize: 8, color: C.muted, textAlign: 'center', margin: '1px 0 0' }}>{new Date(s.ts).toLocaleDateString('en-UG', { day:'numeric', month:'short' })}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props { orders: Order[] }

export function OrdersClient({ orders: initial }: Props) {
  const [orders, setOrders] = useState<Order[]>(initial);
  const [tab, setTab]       = useState(0);

  function updateOrder(id: string, nextStatus: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o));
  }

  const filtered = (() => {
    const f = TABS[tab].filter;
    return f === null ? orders : orders.filter(o => f.includes(o.status));
  })();

  const newCount     = orders.filter(o => o.status === 'pending').length;
  const activeCount  = orders.filter(o => ['confirmed','dispatched','in_transit'].includes(o.status)).length;
  const revenue      = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Orders
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>Orders placed by buyers</p>
        </div>
        <Link href="/farmer/marketplace" style={{ fontSize: 12, fontWeight: 700, color: C.greenMed, textDecoration: 'none' }}>
          My Listings →
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'New Orders',   value: newCount,    color: C.amber,  bg: C.amberBg  },
          { label: 'In Progress',  value: activeCount, color: C.blue,   bg: C.blueBg   },
          { label: 'Revenue',      value: revenue > 0 ? `UGX ${revenue >= 1e6 ? (revenue/1e6).toFixed(1)+'M' : Math.round(revenue/1000)+'K'}` : '—', color: C.green, bg: C.greenBg },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: s.color, margin: 0, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontSize: 10, color: s.color, margin: '2px 0 0', fontWeight: 600, opacity: 0.8 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {TABS.map((t, i) => {
          const count = t.filter === null ? orders.length : orders.filter(o => (t.filter as string[]).includes(o.status)).length;
          return (
            <button key={t.label} onClick={() => setTab(i)} style={{
              padding: '6px 14px', borderRadius: 999, border: 'none',
              background: tab === i ? C.green : 'var(--color-surface-2)',
              color: tab === i ? '#fff' : C.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {t.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '52px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🛒</p>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text }}>
            {orders.length === 0 ? 'No orders yet' : 'Nothing here'}
          </p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {orders.length === 0 ? 'Buyers will see your listings and place orders here' : 'Try another tab above'}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onAction={updateOrder} />
          ))}
        </div>
      )}
    </div>
  );
}
