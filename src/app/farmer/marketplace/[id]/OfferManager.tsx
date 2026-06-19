'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  red: 'var(--color-danger)', redBg: 'var(--color-danger-bg)',
  blue: 'var(--color-sky)', blueBg: 'var(--color-sky-bg)',
};

type Offer = {
  id: string;
  buyer_id: string;
  offered_price: number;
  counter_price: number | null;
  status: string;
  message: string | null;
  farmer_note: string | null;
  created_at: string;
  buyer_name?: string;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'New Offer',   color: C.amber,  bg: C.amberBg },
  countered: { label: 'Countered',   color: C.blue,   bg: C.blueBg  },
  accepted:  { label: 'Accepted',    color: C.green,  bg: C.greenBg },
  rejected:  { label: 'Declined',    color: C.red,    bg: C.redBg   },
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d/60)}h ago`;
  return `${Math.floor(d/1440)}d ago`;
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 260, background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ok ? '✅ ' : '❌ '}{msg}</p>
    </div>
  );
}

function OfferCard({ offer, askingPrice, onDone }: { offer: Offer; askingPrice: number; onDone: () => void }) {
  const [action, setAction]         = useState<'counter' | null>(null);
  const [counterPrice, setCounter]  = useState(Math.round(askingPrice * 0.95));
  const [note, setNote]             = useState('');
  const [pending, startT]           = useTransition();
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  const cfg    = STATUS_CFG[offer.status] ?? STATUS_CFG.pending;
  const priceDiff = Math.round(((offer.offered_price - askingPrice) / askingPrice) * 100);
  const isActive = ['pending', 'countered'].includes(offer.status);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  async function doAction(act: string, extra: Record<string, any> = {}) {
    startT(async () => {
      const res = await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offer.id, action: act, ...extra }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          act === 'accept'  ? 'Offer accepted! Order created.' :
          act === 'reject'  ? 'Offer declined.'                :
          act === 'counter' ? 'Counter sent to buyer.'         : 'Done',
          true,
        );
        setAction(null);
        setTimeout(onDone, 1000);
      } else {
        showToast(json.error ?? 'Action failed', false);
      }
    });
  }

  return (
    <div style={{
      background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden',
      border: offer.status === 'pending' ? `1.5px solid ${C.amber}` : `1px solid ${C.border}`,
    }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Avatar */}
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
            {(offer.buyer_name?.[0] ?? 'B').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                {offer.buyer_name ?? 'Buyer'}
              </p>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{timeAgo(offer.created_at)}</p>
          </div>
        </div>

        {/* Price comparison */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: offer.status === 'pending' ? C.amberBg : C.greenBg, borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>Their offer</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: offer.status === 'pending' ? C.amber : C.green, margin: 0, letterSpacing: '-0.02em' }}>
              UGX {Math.round(offer.offered_price).toLocaleString()}
            </p>
            <p style={{ fontSize: 10, margin: '2px 0 0', color: priceDiff < 0 ? C.red : C.green, fontWeight: 700 }}>
              {priceDiff >= 0 ? `+${priceDiff}%` : `${priceDiff}%`} vs your ask
            </p>
          </div>
          {offer.counter_price && (
            <div style={{ background: C.blueBg, borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>Your counter</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: C.blue, margin: 0, letterSpacing: '-0.02em' }}>
                UGX {Math.round(offer.counter_price).toLocaleString()}
              </p>
            </div>
          )}
          {!offer.counter_price && (
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>Your asking</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
                UGX {Math.round(askingPrice).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {offer.message && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: C.muted, margin: 0, fontStyle: 'italic' }}>"{offer.message}"</p>
          </div>
        )}
      </div>

      {/* Counter form */}
      {action === 'counter' && (
        <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: '14px 0 8px' }}>Your counter price (per kg)</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.muted }}>UGX</span>
              <input
                type="number"
                value={counterPrice}
                onChange={e => setCounter(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px 10px 44px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, fontWeight: 700, color: C.text, background: 'var(--d-input-bg)', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Reason or note to buyer (optional)"
            rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => doAction('counter', { counterPrice, farmerNote: note || undefined })}
              disabled={pending}
              style={{ flex: 1, padding: '11px', background: C.blue, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              {pending ? '⏳ Sending…' : `Send Counter — UGX ${counterPrice.toLocaleString()}`}
            </button>
            <button onClick={() => setAction(null)} style={{ padding: '11px 14px', background: 'var(--color-surface-2)', color: C.muted, border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {isActive && action === null && (
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
          <button
            onClick={() => doAction('accept')}
            disabled={pending}
            style={{ flex: 1, padding: '11px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 10px rgba(34,197,94,0.3)' }}
          >
            {pending ? '⏳' : `✅ Accept UGX ${Math.round(offer.offered_price).toLocaleString()}`}
          </button>
          <button
            onClick={() => setAction('counter')}
            disabled={pending}
            style={{ padding: '11px 14px', background: C.blueBg, color: C.blue, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Counter
          </button>
          <button
            onClick={() => doAction('reject')}
            disabled={pending}
            style={{ padding: '11px 14px', background: C.redBg, color: C.red, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  listingId: string;
  askingPrice: number;
  cropType: string;
  initialOffers: Offer[];
}

export function OfferManager({ listingId, askingPrice, cropType, initialOffers }: Props) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function reload() {
    setLoading(true);
    const res = await fetch(`/api/offers?listingId=${listingId}`);
    const json = await res.json();
    if (json.success) setOffers(json.data ?? []);
    setLoading(false);
    router.refresh();
  }

  const pending  = offers.filter(o => ['pending','countered'].includes(o.status));
  const resolved = offers.filter(o => ['accepted','rejected'].includes(o.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {loading && <p style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>Refreshing…</p>}

      {offers.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>🤝</p>
          <p style={{ fontWeight: 700, fontSize: 15, color: C.text }}>No offers yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Share your listing link to attract buyers.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Pending · {pending.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map(o => <OfferCard key={o.id} offer={o} askingPrice={askingPrice} onDone={reload} />)}
              </div>
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 8px' }}>
                Resolved · {resolved.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {resolved.map(o => <OfferCard key={o.id} offer={o} askingPrice={askingPrice} onDone={reload} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
