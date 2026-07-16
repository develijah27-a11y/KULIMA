'use client';

import { useState } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, Building2 } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const STATUS_CFG: Record<string, { label: string; c: string; bg: string }> = {
  notified: { label: 'Awaiting your response', c: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  accepted: { label: 'Accepted',              c: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  declined: { label: 'Declined',              c: C.muted,                bg: 'var(--color-surface-2)'   },
  expired:  { label: 'No longer available',   c: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
};

interface Offer {
  id: string;
  status: 'notified' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  contract: {
    id: string; crop_type: string; district: string; quantity_kg: number;
    price_ugx: number; delivery_date: string; notes: string | null; offtaker_id: string;
  } | null;
}

export function ContractOffersClient({ offers, offtakerNames }: { offers: Offer[]; offtakerNames: Record<string, string> }) {
  const [rows, setRows] = useState(offers);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function respond(offerId: string, action: 'accept' | 'decline') {
    setBusy(offerId); setError('');
    try {
      const res = await fetch(`/api/offtaker-contracts/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        if (action === 'accept') setRows(prev => prev.map(o => o.id === offerId ? { ...o, status: 'expired' } : o));
        return;
      }
      setRows(prev => prev.map(o => o.id === offerId ? { ...o, status: json.status } : o));
    } finally {
      setBusy(null);
    }
  }

  const pending = rows.filter(o => o.status === 'notified');
  const resolved = rows.filter(o => o.status !== 'notified');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Contract Offers</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Bulk buyers you've worked with before or who've favourited you</p>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.muted }}><FileText size={48} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No contract offers yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Bulk buyers you've sold to before, or who've favourited you, will send offers here automatically.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <Section title={`Awaiting Your Response (${pending.length})`} highlight>
              {pending.map(o => (
                <OfferRow key={o.id} o={o} offtakerName={o.contract ? offtakerNames[o.contract.offtaker_id] : undefined}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                    <button disabled={busy === o.id} onClick={() => respond(o.id, 'decline')}
                      style={{ padding: '9px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <XCircle size={14} /> Decline
                    </button>
                    <button disabled={busy === o.id} onClick={() => respond(o.id, 'accept')}
                      style={{ padding: '9px', borderRadius: 8, border: 'none', background: busy === o.id ? 'var(--color-surface-2)' : C.greenMed, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <CheckCircle2 size={14} /> {busy === o.id ? '…' : 'Accept'}
                    </button>
                  </div>
                </OfferRow>
              ))}
            </Section>
          )}
          {resolved.length > 0 && (
            <Section title="History">
              {resolved.map(o => (
                <OfferRow key={o.id} o={o} offtakerName={o.contract ? offtakerNames[o.contract.offtaker_id] : undefined} />
              ))}
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
      <p style={{ fontSize: 11, fontWeight: 700, color: highlight ? 'var(--color-harvest)' : C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</p>
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function OfferRow({ o, offtakerName, children }: { o: Offer; offtakerName?: string; children?: React.ReactNode }) {
  const st = STATUS_CFG[o.status];
  const c = o.contract;
  if (!c) return null;
  const daysLeft = Math.ceil((new Date(c.delivery_date).getTime() - Date.now()) / 864e5);

  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.green }}>
          <Building2 size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{c.crop_type} · {(c.quantity_kg ?? 0).toLocaleString()} kg</p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            {offtakerName ?? 'Bulk Buyer'} · {c.district} · Delivery {new Date(c.delivery_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
            {daysLeft >= 0 && daysLeft <= 14 && o.status === 'notified' && <span style={{ color: 'var(--color-harvest)', fontWeight: 700 }}> · <Clock size={10} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> {daysLeft}d left</span>}
          </p>
          {c.notes && <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', fontStyle: 'italic' }}>{c.notes}</p>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 2px' }}>UGX {Math.round(c.price_ugx ?? 0).toLocaleString()}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.c }}>{st.label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
