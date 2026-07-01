'use client';

import { useState, useEffect, useTransition } from 'react';
import { CheckCircle2, X } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 260, background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{ok ? <CheckCircle2 size={16} /> : <X size={16} />}{msg}</p>
    </div>
  );
}

export default function AdminCommissionPage() {
  const [rate, setRate]     = useState(2.5);
  const [minFee, setMinFee] = useState(500);
  const [maxFee, setMaxFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [pending, start]    = useTransition();

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetch('/api/admin/commission')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setRate(json.data.rate_percent ?? 2.5);
          setMinFee(json.data.min_fee_ugx ?? 500);
          setMaxFee(json.data.max_fee_ugx ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    start(async () => {
      const res = await fetch('/api/admin/commission', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate_percent: rate, min_fee_ugx: minFee, max_fee_ugx: maxFee || null }),
      });
      const json = await res.json();
      if (json.success) showToast('Commission settings saved', true);
      else showToast(json.error ?? 'Failed to save', false);
    });
  }

  // Example calculation preview
  const examples = [50000, 200000, 500000, 1000000, 5000000];

  function calcFee(amount: number) {
    let fee = Math.round(amount * rate / 100);
    if (fee < minFee) fee = minFee;
    if (maxFee > 0 && fee > maxFee) fee = maxFee;
    return fee;
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>Commission Settings</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
          Platform fee deducted from escrow at payment release. Changes apply to future transactions immediately.
        </p>
      </div>

      {loading ? (
        <div style={{ background: C.cardBg, borderRadius: 18, height: 200, boxShadow: C.cardShadow }} className="dash-skeleton" />
      ) : (
        <>
          <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 20px' }}>Rate Configuration</p>

            {/* Rate */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>
                Commission Rate (%)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min={0.5} max={10} step={0.1}
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    value={rate}
                    onChange={e => setRate(Math.max(0.1, Math.min(20, Number(e.target.value))))}
                    step={0.1} min={0.1} max={20}
                    style={{
                      width: 72, padding: '8px 10px', borderRadius: 8,
                      border: `1.5px solid ${C.border}`, fontSize: 15, fontWeight: 800,
                      color: C.text, background: 'var(--d-input-bg)', textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>%</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0' }}>
                Current: {rate}% of each transaction amount
              </p>
            </div>

            {/* Min fee */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>
                Minimum Fee (UGX)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.muted, fontWeight: 600 }}>UGX</span>
                <input
                  type="number"
                  value={minFee}
                  onChange={e => setMinFee(Math.max(0, Number(e.target.value)))}
                  min={0} step={100}
                  style={{
                    width: '100%', padding: '11px 12px 11px 46px', borderRadius: 10,
                    border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 700,
                    color: C.text, background: 'var(--d-input-bg)', boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>Applied when calculated fee is below this amount</p>
            </div>

            {/* Max fee */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>
                Maximum Fee (UGX) — 0 means no cap
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.muted, fontWeight: 600 }}>UGX</span>
                <input
                  type="number"
                  value={maxFee}
                  onChange={e => setMaxFee(Math.max(0, Number(e.target.value)))}
                  min={0} step={1000}
                  style={{
                    width: '100%', padding: '11px 12px 11px 46px', borderRadius: 10,
                    border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 700,
                    color: C.text, background: 'var(--d-input-bg)', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={pending}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: pending ? C.greenBg : C.green, color: pending ? C.green : '#fff',
                fontSize: 15, fontWeight: 800, cursor: pending ? 'wait' : 'pointer',
              }}
            >
              {pending ? '⏳ Saving…' : 'Save Commission Settings'}
            </button>
          </div>

          {/* Fee preview */}
          <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Fee Preview</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>How much sellers receive at current rate</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted }}>Sale Amount</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.muted }}>Platform Fee</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.muted }}>Seller Receives</th>
                </tr>
              </thead>
              <tbody>
                {examples.map(amt => {
                  const fee = calcFee(amt);
                  const net = amt - fee;
                  return (
                    <tr key={amt} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: C.text, fontWeight: 600 }}>
                        UGX {amt.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: C.amber, fontWeight: 600, textAlign: 'right' }}>
                        UGX {fee.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 800, color: C.green, textAlign: 'right' }}>
                        UGX {net.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Info */}
          <div style={{ background: C.greenBg, borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: 0 }}>How commission works</p>
              <p style={{ fontSize: 12, color: '#065F46', margin: '4px 0 0', opacity: 0.85, lineHeight: 1.5 }}>
                When a buyer confirms receipt, the escrow is released. The platform fee is deducted from the gross amount, and the net is transferred to the seller's wallet. All fee deductions are logged as separate transactions for full audit visibility.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
