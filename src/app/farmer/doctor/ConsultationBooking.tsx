'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Smartphone, Car } from 'lucide-react';

interface Consultation {
  id: string;
  type: string;
  status: string;
  fee_ugx: number;
  notes: string | null;
  created_at: string;
  pathologist: { full_name: string; location: string } | null;
}

interface Props {
  walletBalance: number;
  consultations: Consultation[];
}

const C = {
  text:   'var(--d-text)',
  muted:  'var(--d-muted)',
  border: 'var(--d-border)',
  card:   'var(--d-card)',
  green:  'var(--color-primary)',
  amber:  'var(--color-harvest)',
  shadow: 'var(--d-shadow-card)',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending match', color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)'  },
  matched:   { label: 'Matched',       color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)'      },
  paid:      { label: 'Paid',          color: 'var(--color-primary)',  bg: 'var(--color-primary-bg)'  },
  active:    { label: 'Active',        color: 'var(--color-primary)',  bg: 'var(--color-primary-bg)'  },
  completed: { label: 'Completed',     color: 'var(--color-muted)',    bg: 'var(--color-surface-2)'   },
  cancelled: { label: 'Cancelled',     color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)'   },
};

export function ConsultationBooking({ walletBalance, consultations }: Props) {
  const [type, setType]       = useState<'remote' | 'farm_visit'>('remote');
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; msg: string; pathologist?: string; convId?: string } | null>(null);

  const fee = type === 'farm_visit' ? 50000 : 15000;
  const canAfford = walletBalance >= fee;

  const book = async () => {
    if (!canAfford || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Booking failed');
      const pathName = json.assigned?.name ?? null;
      setResult({
        ok: true,
        msg: pathName
          ? `Consultation booked! ${pathName} has been matched. Open chat to connect.`
          : 'Booked! We are matching you with the nearest pathologist.',
        pathologist: json.data?.pathologist_id ?? null,
        convId: json.data?.id,
      });
    } catch (err: any) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>Book a Consultation</p>
          <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Speak directly with a plant pathologist</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Wallet balance</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: canAfford ? C.green : 'var(--color-danger)', margin: 0 }}>
            UGX {walletBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {([
            { id: 'remote', label: 'Remote Consultation', sub: 'Video / voice call', fee: 15000, icon: <Smartphone size={18} /> as ReactNode },
            { id: 'farm_visit', label: 'Farm Visit', sub: 'Pathologist visits your farm', fee: 50000, icon: <Car size={18} /> as ReactNode },
          ]).map(opt => {
            const sel = type === opt.id;
            return (
              <button key={opt.id} onClick={() => setType(opt.id as any)} style={{
                padding: '13px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                background: sel ? 'var(--color-primary-bg)' : 'var(--d-page)',
                border: `2px solid ${sel ? C.green : C.border}`,
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', marginBottom: '4px', color: sel ? C.green : C.muted }}>{opt.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 2px' }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: '0 0 6px' }}>{opt.sub}</p>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.green, margin: 0 }}>UGX {opt.fee.toLocaleString()}</p>
              </button>
            );
          })}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>
            Describe the issue (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Yellow leaves on maize, white patches on beans…"
            rows={2}
            maxLength={500}
            style={{
              width: '100%', borderRadius: 10, border: `1.5px solid ${C.border}`, padding: '9px 12px',
              fontSize: 12, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
              color: C.text, background: 'var(--d-page)', outline: 'none', resize: 'none',
            }}
          />
        </div>

        {/* Result */}
        {result && (
          <div style={{
            padding: '11px 14px', borderRadius: 10, marginBottom: 12,
            background: result.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${result.ok ? 'var(--color-success)' : 'var(--color-danger)'}`,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: result.ok ? 'var(--color-success)' : 'var(--color-danger)', margin: 0 }}>
              {result.msg}
            </p>
          </div>
        )}

        {!canAfford && (
          <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
            <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>
              Insufficient wallet balance. Please top up your wallet first.{' '}
              <Link href="/farmer/wallet" style={{ fontWeight: 700, color: 'var(--color-danger)' }}>Top up →</Link>
            </p>
          </div>
        )}

        <button
          onClick={book}
          disabled={!canAfford || loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 12, border: 'none',
            background: canAfford && !loading ? C.green : 'var(--d-border)',
            color: '#fff', fontWeight: 800, fontSize: 14,
            cursor: canAfford && !loading ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Booking…' : `Book Consultation — UGX ${fee.toLocaleString()}`}
        </button>
      </div>

      {/* Previous consultations */}
      {consultations.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Your Bookings</p>
          </div>
          {consultations.slice(0, 4).map((c) => {
            const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending;
            return (
              <div key={c.id} style={{ padding: '13px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 3 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
                      {c.type === 'farm_visit' ? <><Car size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Farm Visit</> : <><Smartphone size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Remote</>}
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    {c.pathologist?.full_name ?? 'Awaiting pathologist'} · UGX {Number(c.fee_ugx).toLocaleString()}
                  </p>
                </div>
                {c.pathologist && (c.status === 'matched' || c.status === 'active') && (
                  <Link href={`/farmer/doctor/chat/${c.id}`}
                    style={{ padding: '7px 13px', background: 'var(--color-primary-bg)', color: C.green, borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                    Chat →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
