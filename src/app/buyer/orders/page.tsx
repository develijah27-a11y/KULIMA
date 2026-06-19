'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  blue: 'var(--color-sky)', blueBg: 'var(--color-sky-bg)',
  red: 'var(--color-danger)', redBg: 'var(--color-danger-bg)',
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
  in_transit_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  farmer: { full_name: string; location: string } | null;
};

const STEPS = [
  { key: 'pending',    label: 'Placed',     icon: '📋' },
  { key: 'confirmed',  label: 'Confirmed',  icon: '✅' },
  { key: 'dispatched', label: 'Driver',     icon: '🚛' },
  { key: 'in_transit', label: 'On the way', icon: '🚚' },
  { key: 'delivered',  label: 'Delivered',  icon: '📦' },
  { key: 'completed',  label: 'Done',       icon: '⭐' },
];

const STEP_IDX: Record<string, number> = {
  pending: 0, confirmed: 1, dispatched: 2, in_transit: 3, delivered: 4, completed: 5, cancelled: -1,
};

function Pipeline({ status }: { status: string }) {
  const cur = STEP_IDX[status] ?? 0;
  if (status === 'cancelled') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
      <span style={{ fontSize: 14, color: C.red }}>❌</span>
      <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Order Cancelled</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'auto', padding: '10px 0' }}>
      {STEPS.map((s, i) => {
        const done    = i < cur;
        const active  = i === cur;
        const future  = i > cur;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
                background: done ? C.green : active ? C.green : 'var(--color-surface-2)',
                border: active ? `2px solid ${C.green}` : done ? 'none' : `2px solid ${C.border}`,
                boxShadow: active ? `0 0 0 3px ${C.greenBg}` : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>
                      : <span style={{ fontSize: 11 }}>{s.icon}</span>}
              </div>
              <span style={{ fontSize: 9, color: active ? C.green : done ? C.greenMed : C.muted, fontWeight: active || done ? 700 : 400, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? C.green : 'var(--color-surface-2)', transition: 'background 0.3s', margin: '0 2px', marginBottom: 18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 260, maxWidth: 340,
      background: ok ? '#065F46' : '#991B1B', color: '#fff',
      borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ok ? '✅ ' : '❌ '}{msg}</p>
    </div>
  );
}

function OrderCard({ order, onAction }: { order: Order; onAction: () => void }) {
  const [pending, startT] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const emoji = CROP_EMOJI[order.crop_type?.toLowerCase()] ?? '🌿';
  const farmer = order.farmer;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function confirmReceipt() {
    startT(async () => {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      const json = await res.json();
      if (json.success) { showToast('Receipt confirmed — payment released to farmer!', true); onAction(); }
      else showToast(json.error ?? 'Failed', false);
    });
  }

  async function cancelOrder() {
    startT(async () => {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const json = await res.json();
      if (json.success) { showToast('Order cancelled', true); onAction(); }
      else showToast(json.error ?? 'Failed', false);
    });
  }

  const canCancel   = ['pending', 'confirmed'].includes(order.status);
  const canComplete = order.status === 'delivered';

  return (
    <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden', marginBottom: 14 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
                {order.crop_type}
              </p>
              {order.status === 'delivered' && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: C.amberBg, color: C.amber }}>
                  Confirm receipt
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
              {order.quantity_kg} kg
              {farmer?.full_name ? ` · ${farmer.full_name}` : ''}
              {order.pickup_district ? ` · ${order.pickup_district}` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
              UGX {Math.round(order.total_amount).toLocaleString()}
            </p>
            <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>
              {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ padding: '0 20px' }}>
        <Pipeline status={order.status} />
      </div>

      {/* Notes */}
      {(order.farmer_note || order.buyer_note) && (
        <div style={{ padding: '0 20px 12px' }}>
          {order.farmer_note && (
            <div style={{ background: C.greenBg, borderRadius: 10, padding: '8px 12px', marginBottom: 6 }}>
              <p style={{ fontSize: 11, color: C.greenMed, margin: 0 }}>
                <strong>Farmer note:</strong> {order.farmer_note}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {(canComplete || canCancel) && (
        <div style={{ padding: '0 20px 18px', display: 'flex', gap: 10 }}>
          {canComplete && (
            <button
              onClick={confirmReceipt}
              disabled={pending}
              style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: pending ? C.amberBg : C.amber, color: pending ? C.amber : '#fff',
                fontSize: 13, fontWeight: 700, cursor: pending ? 'wait' : 'pointer',
              }}
            >
              {pending ? '⏳ Confirming…' : '✅ Confirm Receipt — Release Payment'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={cancelOrder}
              disabled={pending}
              style={{
                padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.red, fontSize: 13, fontWeight: 600,
                cursor: pending ? 'wait' : 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_TABS = [
  { label: 'All',       filter: null },
  { label: 'Active',    filter: ['pending','confirmed','dispatched','in_transit'] },
  { label: 'Delivered', filter: ['delivered'] },
  { label: 'Done',      filter: ['completed'] },
  { label: 'Cancelled', filter: ['cancelled'] },
];

export default function BuyerOrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(0);

  async function loadOrders() {
    setLoading(true);
    try {
      const res  = await fetch('/api/orders?role=buyer');
      const json = await res.json();
      setOrders(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOrders(); }, []);

  const filtered = orders.filter(o => {
    const f = STATUS_TABS[tab].filter;
    return f === null || f.includes(o.status);
  });

  const activeCount    = orders.filter(o => ['pending','confirmed','dispatched','in_transit'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalSpend     = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Orders
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>Track purchases from farmers</p>
        </div>
        <Link href="/buyer/listings" style={{ padding: '9px 18px', background: C.green, color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
          Browse →
        </Link>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Active Orders',   value: activeCount,    color: C.green,  bg: C.greenBg },
            { label: 'Awaiting Confirm',value: deliveredCount, color: C.amber,  bg: C.amberBg },
            { label: 'Total Spend',     value: `UGX ${totalSpend >= 1e6 ? (totalSpend/1e6).toFixed(1)+'M' : Math.round(totalSpend/1000)+'K'}`, color: C.purple, bg: C.purpleBg },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 16px' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: s.color, margin: 0, letterSpacing: '-0.02em' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: s.color, margin: '3px 0 0', fontWeight: 600, opacity: 0.8 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {STATUS_TABS.map((t, i) => {
          const count = t.filter === null ? orders.length : orders.filter(o => (t.filter as string[]).includes(o.status)).length;
          return (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              style={{
                padding: '6px 14px', borderRadius: 999, border: 'none',
                background: tab === i ? C.green : 'var(--color-surface-2)',
                color: tab === i ? '#fff' : C.muted,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Orders */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: C.cardBg, borderRadius: 18, height: 160, boxShadow: C.cardShadow }} className="dash-skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '52px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>📦</p>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text }}>
            {orders.length === 0 ? 'No orders yet' : 'No orders in this category'}
          </p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 20 }}>
            {orders.length === 0 ? 'Browse listings and tap "Buy Now" to place your first order' : 'Try another tab above'}
          </p>
          {orders.length === 0 && (
            <Link href="/buyer/listings" style={{ display: 'inline-block', padding: '12px 24px', background: C.green, color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Browse Listings →
            </Link>
          )}
        </div>
      ) : (
        <div>
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onAction={loadOrders} />
          ))}
        </div>
      )}
    </div>
  );
}
