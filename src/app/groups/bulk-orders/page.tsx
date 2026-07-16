'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Banknote } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const STATUS_CFG: Record<string, { label: string; c: string; bg: string }> = {
  quote_requested: { label: 'Awaiting Quote', c: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  quoted:           { label: 'Quoted — Review', c: 'var(--color-sky)',    bg: 'var(--color-sky-bg)'     },
  confirmed:        { label: 'Confirmed',        c: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  delivered:        { label: 'Delivered',        c: C.greenMed,           bg: 'var(--color-primary-bg)' },
  cancelled:        { label: 'Cancelled',        c: 'var(--color-danger)', bg: 'var(--color-danger-bg)'  },
};

interface BulkOrder {
  id: string;
  product_name: string;
  unit: string;
  requested_quantity: number;
  quantity: number;
  unit_price: number;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  supplier?: { full_name: string } | null;
}

export default function BulkOrdersPage() {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [orders, setOrders]   = useState<BulkOrder[] | null>(null);
  const [busy, setBusy]       = useState<string | null>(null);
  const [error, setError]     = useState('');

  const load = useCallback(async (gid: string) => {
    const res = await fetch(`/api/groups/${gid}/bulk-orders`);
    const json = await res.json();
    setOrders(json.orders ?? []);
  }, []);

  useEffect(() => {
    fetch('/api/groups/my-members').then(r => r.json()).then(json => {
      if (json.groupId) { setGroupId(json.groupId); load(json.groupId); }
      else setOrders([]);
    }).catch(() => setOrders([]));
  }, [load]);

  async function respond(orderId: string, status: 'confirmed' | 'cancelled') {
    setBusy(orderId); setError('');
    try {
      const res = await fetch('/api/supplier-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      if (groupId) load(groupId);
    } finally {
      setBusy(null);
    }
  }

  const rows = orders ?? [];
  const needsAttention = rows.filter(o => o.status === 'quoted');
  const awaiting       = rows.filter(o => o.status === 'quote_requested');
  const resolved       = rows.filter(o => ['confirmed', 'delivered', 'cancelled'].includes(o.status));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Bulk Orders</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Request large quantities from agro dealers — they name the discount</p>
        </div>
        <Link href="/groups/suppliers" style={{ padding: '8px 16px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + New Request
        </Link>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {orders === null ? (
        <p style={{ color: C.muted, fontSize: 13 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.muted }}><Package size={48} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No bulk orders yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4, maxWidth: 340, margin: '4px auto' }}>Request a large quantity from a registered agro dealer — they'll review and quote a discounted price for your group.</p>
          <Link href="/groups/suppliers" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Browse Agro Dealers →
          </Link>
        </div>
      ) : (
        <>
          {needsAttention.length > 0 && (
            <Section title={`Quoted — Needs Your Decision (${needsAttention.length})`} highlight>
              {needsAttention.map(o => (
                <OrderRow key={o.id} o={o} busy={busy} onRespond={respond} showActions />
              ))}
            </Section>
          )}
          {awaiting.length > 0 && (
            <Section title={`Awaiting Dealer Quote (${awaiting.length})`}>
              {awaiting.map(o => <OrderRow key={o.id} o={o} busy={busy} onRespond={respond} />)}
            </Section>
          )}
          {resolved.length > 0 && (
            <Section title="Resolved">
              {resolved.map(o => <OrderRow key={o.id} o={o} busy={busy} onRespond={respond} />)}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, highlight, children }: { title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: highlight ? 'var(--color-sky)' : C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</p>
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function OrderRow({ o, busy, onRespond, showActions }: {
  o: BulkOrder; busy: string | null; showActions?: boolean;
  onRespond: (id: string, status: 'confirmed' | 'cancelled') => void;
}) {
  const st = STATUS_CFG[o.status] ?? STATUS_CFG.quote_requested;
  const isBusy = busy === o.id;
  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{o.product_name}</p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            {o.requested_quantity ?? o.quantity} {o.unit} requested{o.supplier?.full_name ? ` · ${o.supplier.full_name}` : ''}
          </p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: st.bg, color: st.c, flexShrink: 0 }}>{st.label}</span>
      </div>
      {o.status !== 'quote_requested' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.greenMed }}>
          <Banknote size={14} />
          <p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>
            UGX {Math.round(o.unit_price).toLocaleString()}/{o.unit} · Total UGX {Math.round(o.amount).toLocaleString()}
          </p>
        </div>
      )}
      {showActions && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <button disabled={isBusy} onClick={() => onRespond(o.id, 'cancelled')}
            style={{ padding: '9px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 13, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
            Decline
          </button>
          <button disabled={isBusy} onClick={() => onRespond(o.id, 'confirmed')}
            style={{ padding: '9px', borderRadius: 8, border: 'none', background: isBusy ? 'var(--color-surface-2)' : C.greenMed, color: isBusy ? C.muted : '#fff', fontWeight: 700, fontSize: 13, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
            {isBusy ? '…' : 'Confirm Order'}
          </button>
        </div>
      )}
    </div>
  );
}
