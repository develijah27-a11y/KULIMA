'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, X, Package } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending Review', color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  approved: { label: 'Approved',       color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  rejected: { label: 'Rejected',       color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

type Return = {
  id: string;
  order_id: string;
  reason: string;
  quantity_returned: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  supplier_note: string | null;
  order: { product_name: string; unit: string; quantity: number; amount: number } | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SupplierReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending');
  const [responding, setResponding] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/supplier-orders/returns')
      .then(r => r.json())
      .then(d => { setReturns(d.returns ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const respond = async (id: string, status: 'approved' | 'rejected') => {
    setResponding(id);
    setError('');
    const res = await fetch('/api/supplier-orders/returns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, supplier_note: noteMap[id] ?? '' }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed'); showToast(data.error ?? 'Failed', false); }
    else {
      setReturns(prev => prev.map(r => r.id === id ? { ...r, status, resolved_at: new Date().toISOString(), supplier_note: noteMap[id] ?? null } : r));
      showToast(status === 'approved' ? 'Return approved.' : 'Return rejected.', true);
    }
    setResponding(null);
  };

  const pending  = returns.filter(r => r.status === 'pending');
  const resolved = returns.filter(r => r.status !== 'pending');
  const visible  = tab === 'pending' ? pending : resolved;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, minWidth: 260, background: toast.ok ? '#065F46' : '#991B1B', color: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.ok ? <CheckCircle2 size={16} /> : <X size={16} />}
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{toast.msg}</p>
        </div>
      )}

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Input Returns
        </h1>
        <p style={{ fontSize: 13, color: C.muted }}>
          {pending.length > 0 ? `${pending.length} return${pending.length !== 1 ? 's' : ''} awaiting your review` : 'Manage return requests from farmers'}
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {(['pending','approved','rejected'] as const).map(s => {
          const count = returns.filter(r => r.status === s).length;
          const cfg = STATUS_CFG[s];
          return (
            <div key={s} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: cfg.color, margin: 0 }}>{count}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, margin: 0, textTransform: 'capitalize' }}>{s}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {(['pending', 'resolved'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent',
            color: tab === t ? C.greenMed : C.muted,
            borderBottom: tab === t ? `2px solid ${C.greenMed}` : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'pending' && pending.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--color-harvest)', color: '#fff', borderRadius: 99, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>
      )}

      {/* Returns list */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow }}>
        {loading ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted, fontSize: 14 }}>Loading returns…</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.muted }}><Package size={40} /></div>
            <p style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>No {tab} returns</p>
            <p style={{ fontSize: 13, color: C.muted }}>
              {tab === 'pending' ? 'Return requests from farmers will appear here.' : 'Resolved returns will be listed here.'}
            </p>
          </div>
        ) : (
          visible.map((ret, i) => {
            const cfg = STATUS_CFG[ret.status] ?? STATUS_CFG.pending;
            const ord = ret.order;
            return (
              <div key={ret.id} style={{ padding: '18px 20px', borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: ret.status === 'pending' ? 14 : 0 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                        {ord?.product_name ?? 'Unknown Product'}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px' }}>
                      Return qty: {ret.quantity_returned} {ord?.unit ?? ''} · Original qty: {ord?.quantity ?? '—'} {ord?.unit ?? ''}
                    </p>
                    <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px' }}>
                      <strong>Reason:</strong> {ret.reason}
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Submitted: {fmt(ret.created_at)}</p>
                    {ret.resolved_at && (
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Resolved: {fmt(ret.resolved_at)}</p>
                    )}
                    {ret.supplier_note && (
                      <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0', fontStyle: 'italic' }}>Your note: {ret.supplier_note}</p>
                    )}
                  </div>
                </div>

                {ret.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      placeholder="Optional note to farmer (e.g. collection instructions, refund timeline)…"
                      value={noteMap[ret.id] ?? ''}
                      onChange={e => setNoteMap(prev => ({ ...prev, [ret.id]: e.target.value }))}
                      rows={2}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 12, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => respond(ret.id, 'approved')}
                        disabled={responding === ret.id}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'none', fontWeight: 700, fontSize: 13, cursor: responding === ret.id ? 'not-allowed' : 'pointer' }}
                      >
                        {responding === ret.id ? 'Saving…' : <><CheckCircle2 size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />Approve Return</>}
                      </button>
                      <button
                        onClick={() => respond(ret.id, 'rejected')}
                        disabled={responding === ret.id}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'none', fontWeight: 700, fontSize: 13, cursor: responding === ret.id ? 'not-allowed' : 'pointer' }}
                      >
                        {responding === ret.id ? 'Saving…' : <><X size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />Reject Return</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
