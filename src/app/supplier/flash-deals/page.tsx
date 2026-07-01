'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { CheckCircle2, X, Zap, Leaf, FlaskConical, Package, Wrench, Settings } from 'lucide-react';

function getCatIcon(category: string): React.ReactNode {
  const cat = category?.toLowerCase();
  if (cat === 'seed')        return <Leaf size={20} />;
  if (cat === 'fertiliser')  return <FlaskConical size={20} />;
  if (cat === 'pesticide')   return <Wrench size={20} />;
  if (cat === 'tool')        return <Wrench size={20} />;
  if (cat === 'equipment')   return <Settings size={20} />;
  return <Package size={20} />;
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  red: 'var(--color-danger)', redBg: 'var(--color-danger-bg)',
};


type Product = {
  id: string;
  name: string;
  category: string;
  price_per_unit: number;
  unit: string;
  stock_qty: number;
  min_order_qty: number;
  is_flash_deal: boolean;
  flash_price_ugx: number | null;
  flash_starts_at: string | null;
  flash_ends_at: string | null;
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 260, background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {ok ? <CheckCircle2 size={16} /> : <X size={16} />}
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{msg}</p>
      </div>
    </div>
  );
}

function useCountdown(endsAt: string | null) {
  const [ms, setMs] = React.useState(() =>
    endsAt ? new Date(endsAt).getTime() - Date.now() : 0
  );
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setMs(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

function CountdownBadge({ endsAt }: { endsAt: string | null }) {
  const t = useCountdown(endsAt);
  if (!t) return <span style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>Expired</span>;
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
      background: C.amberBg, color: C.amber, fontVariantNumeric: 'tabular-nums',
    }}>
      <Zap size={10} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3 }} />{t} left
    </span>
  );
}

export default function FlashDealsPage() {
  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [selectedId, setSelectedId]     = useState('');
  const [discountPct, setDiscountPct]   = useState(15);
  const [durationHrs, setDurationHrs]   = useState(24);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [pending, start]                = useTransition();

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/supplier-products');
      const json = await res.json();
      setProducts(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const activeDeals  = products.filter(p =>
    p.is_flash_deal && p.flash_ends_at && new Date(p.flash_ends_at) > new Date()
  );
  const candidates   = products.filter(p =>
    !p.is_flash_deal && (p.stock_qty ?? 0) >= ((p.min_order_qty ?? 1) * 2)
  );
  const selected     = products.find(p => p.id === selectedId);
  const flashPrice   = selected
    ? Math.round(Number(selected.price_per_unit) * (1 - discountPct / 100))
    : 0;

  async function startDeal() {
    if (!selectedId) { showToast('Select a product first', false); return; }
    start(async () => {
      const res  = await fetch(`/api/supplier-products/${selectedId}/flash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPct, durationHrs }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Flash deal started!', true);
        setShowForm(false);
        setSelectedId('');
        load();
      } else showToast(json.error ?? 'Failed', false);
    });
  }

  async function endDeal(id: string) {
    start(async () => {
      const res  = await fetch(`/api/supplier-products/${id}/flash`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('Flash deal ended', true); load(); }
      else showToast(json.error ?? 'Failed', false);
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>Flash Deals</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Time-limited discounts to move stock fast — highlighted to farmers near you
          </p>
        </div>
        {candidates.length > 0 && (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: '10px 20px', borderRadius: 12, border: 'none',
              background: showForm ? 'var(--color-surface-2)' : C.green,
              color: showForm ? C.muted : '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}
          >
            {showForm ? 'Cancel' : <><Zap size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />New Deal</>}
          </button>
        )}
      </div>

      {/* Create deal form */}
      {showForm && candidates.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 18px' }}>Start a Flash Deal</p>

          {/* Product selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>
              Select Product
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                background: 'var(--d-input-bg)', boxSizing: 'border-box',
              }}
            >
              <option value="">— Choose a product —</option>
              {candidates.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} · UGX {Number(p.price_per_unit).toLocaleString()}/{p.unit} · {p.stock_qty} in stock
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {/* Discount */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>
                Discount — {discountPct}% off
              </label>
              <input
                type="range" min={5} max={50} step={5}
                value={discountPct}
                onChange={e => setDiscountPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.amber, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: C.muted }}>5%</span>
                <span style={{ fontSize: 10, color: C.muted }}>50%</span>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>
                Duration — {durationHrs}h
              </label>
              <input
                type="range" min={1} max={48} step={1}
                value={durationHrs}
                onChange={e => setDurationHrs(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.green, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: C.muted }}>1h</span>
                <span style={{ fontSize: 10, color: C.muted }}>48h</span>
              </div>
            </div>
          </div>

          {/* Price preview */}
          {selected && (
            <div style={{ background: C.amberBg, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, color: C.amber, margin: 0, fontWeight: 600 }}>Flash price</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: C.amber, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                  UGX {flashPrice.toLocaleString()}/{selected.unit}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: C.amber, margin: 0 }}>Was</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.amber, margin: '2px 0 0', textDecoration: 'line-through', opacity: 0.7 }}>
                  UGX {Number(selected.price_per_unit).toLocaleString()}
                </p>
                <p style={{ fontSize: 11, color: C.amber, margin: '2px 0 0' }}>
                  Ends {new Date(Date.now() + durationHrs * 3_600_000).toLocaleString('en-UG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={startDeal}
            disabled={pending || !selectedId}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: !selectedId ? 'var(--color-surface-2)' : pending ? C.amberBg : C.amber,
              color: !selectedId ? C.muted : pending ? C.amber : '#fff',
              fontSize: 14, fontWeight: 800, cursor: !selectedId || pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Starting…' : `Start ${durationHrs}h Flash Deal`}
          </button>
        </div>
      )}

      {/* Active deals */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => <div key={i} style={{ background: C.cardBg, borderRadius: 16, height: 90, boxShadow: C.cardShadow }} className="dash-skeleton" />)}
        </div>
      ) : activeDeals.length > 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Active Flash Deals</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: C.amberBg, color: C.amber }}>
              {activeDeals.length} live
            </span>
          </div>
          {activeDeals.map((p, i) => {
            const saving = Math.round(Number(p.price_per_unit) - Number(p.flash_price_ugx ?? p.price_per_unit));
            const pct    = Math.round((saving / Number(p.price_per_unit)) * 100);
            return (
              <div key={p.id} style={{ padding: '16px 20px', borderBottom: i < activeDeals.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.amber }}>
                    {getCatIcon(p.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{p.name}</p>
                      <CountdownBadge endsAt={p.flash_ends_at} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 16, fontWeight: 900, color: C.amber, margin: 0 }}>
                        UGX {Number(p.flash_price_ugx ?? p.price_per_unit).toLocaleString()}/{p.unit}
                      </p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0, textDecoration: 'line-through' }}>
                        UGX {Number(p.price_per_unit).toLocaleString()}
                      </p>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: C.redBg, color: C.red }}>
                        -{pct}%
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
                      {p.stock_qty} in stock · ends {p.flash_ends_at ? new Date(p.flash_ends_at).toLocaleString('en-UG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => endDeal(p.id)}
                    disabled={pending}
                    style={{
                      padding: '7px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
                      background: 'transparent', color: C.muted, fontSize: 12, fontWeight: 600,
                      cursor: pending ? 'wait' : 'pointer', flexShrink: 0,
                    }}
                  >
                    End early
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.amber }}><Zap size={48} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>No active flash deals</p>
          <p style={{ fontSize: 13, color: C.muted }}>
            {candidates.length > 0
              ? 'Click "⚡ New Deal" to launch a time-limited promotion.'
              : 'Add products to your catalogue and restock before running flash deals.'}
          </p>
        </div>
      )}

      {/* Candidates */}
      {!showForm && candidates.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Ready to Flash</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>High-stock products — good candidates for a deal</p>
          </div>
          {candidates.slice(0, 5).map((p, i) => {
            return (
              <div key={p.id} style={{ padding: '12px 20px', borderBottom: i < Math.min(candidates.length, 5) - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', flexShrink: 0, color: C.muted }}>{getCatIcon(p.category)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>
                    UGX {Number(p.price_per_unit).toLocaleString()}/{p.unit} · {p.stock_qty} in stock
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedId(p.id); setShowForm(true); }}
                  style={{
                    padding: '7px 14px', borderRadius: 10, border: 'none',
                    background: C.amberBg, color: C.amber, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Flash
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
