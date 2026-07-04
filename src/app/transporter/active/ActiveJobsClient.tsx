'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Zap, Snowflake, Radio, Car, CheckCircle2, Package, MapPin, Target, MessageSquare, AlertTriangle } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)',
};

const TYPE_META: Record<string, { icon: ReactNode; label: string; color: string }> = {
  standard: { icon: <Truck size={16} />,     label: 'Standard',     color: 'var(--color-primary)' },
  fast:     { icon: <Zap size={16} />,       label: 'Fast Delivery', color: 'var(--color-harvest)' },
  cold:     { icon: <Snowflake size={16} />, label: 'Cool Transport', color: '#0EA5E9' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface Props {
  pending:   any[];
  active:    any[];
  completed: any[];
}

export function ActiveJobsClient({ pending, active, completed }: Props) {
  const router = useRouter();
  const tabs   = ['pending', 'active', 'completed'] as const;
  const [tab, setTab]     = useState<typeof tabs[number]>(pending.length > 0 ? 'pending' : active.length > 0 ? 'active' : 'completed');
  const [busy, setBusy]   = useState<string | null>(null);
  const [error, setError] = useState('');

  const counts = { pending: pending.length, active: active.length, completed: completed.length };

  async function respondToDelivery(deliveryId: string, action: 'accept' | 'decline') {
    setBusy(deliveryId); setError('');
    try {
      const res  = await fetch('/api/deliveries/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_id: deliveryId, action }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Action failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function updateDelivery(deliveryId: string, act: 'start_transit' | 'complete') {
    setBusy(deliveryId); setError('');
    try {
      const res  = await fetch('/api/deliveries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deliveryId, action: act }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Update failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Active Jobs
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Manage pending requests and active deliveries</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: tab === t ? C.green : 'var(--color-surface-2)',
              color: tab === t ? '#fff' : C.muted,
              textTransform: 'capitalize',
            }}>
            {t} {counts[t] > 0 && <span style={{ marginLeft: 3, background: 'rgba(255,255,255,0.25)', padding: '1px 5px', borderRadius: 99, fontSize: 10 }}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', borderRadius: 10, fontSize: 13, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} />{error}
        </div>
      )}

      {/* ── PENDING TAB ──────────────────────────────────────────────────────── */}
      {tab === 'pending' && (
        pending.length === 0 ? (
          <EmptyState icon={<Radio size={48} />} title="No pending requests" body="The system will notify you when a delivery matches your vehicle and district." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((a: any) => {
              const d  = a.delivery;
              const tm = TYPE_META[d?.delivery_type] ?? TYPE_META.standard;
              const isBusy = busy === d?.id;
              return (
                <div key={a.id} style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '18px 20px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ display: 'flex', color: tm.color }}>{tm.icon}</span>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>
                          {d?.pickup_district} → {d?.dropoff_district}
                        </p>
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                        {d?.cargo_kg} kg {d?.cargo_type ? `· ${d.cargo_type}` : ''} · ~{d?.distance_km} km · {tm.label}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, color: C.muted }}>{timeAgo(a.notified_at)}</span>
                  </div>

                  {/* Earnings */}
                  <div style={{ padding: '10px 12px', background: 'var(--color-primary-bg)', borderRadius: 10, marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px' }}>Your earnings</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
                      UGX {Number(d?.driver_earnings ?? 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Location details */}
                  {(d?.pickup_location || d?.dropoff_location) && (
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                      <p style={{ margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />Pickup: {d.pickup_location}</p>
                      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Package size={11} />Dropoff: {d.dropoff_location}</p>
                    </div>
                  )}

                  {d?.notes && (
                    <p style={{ fontSize: 11, color: C.muted, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 8, margin: '0 0 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MessageSquare size={11} />{d.notes}</span>
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button disabled={isBusy} onClick={() => respondToDelivery(d.id, 'decline')}
                      style={{ padding: '11px', borderRadius: 10, border: '1.5px solid var(--d-border)', background: 'var(--d-input-bg)', color: C.muted, fontWeight: 700, fontSize: 14, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
                      Decline
                    </button>
                    <button disabled={isBusy} onClick={() => respondToDelivery(d.id, 'accept')}
                      style={{ padding: '11px', borderRadius: 10, border: 'none', background: isBusy ? 'var(--color-surface-2)' : C.green, color: isBusy ? C.muted : '#fff', fontWeight: 700, fontSize: 14, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
                      {isBusy ? 'Updating…' : 'Accept Job'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── ACTIVE TAB ───────────────────────────────────────────────────────── */}
      {tab === 'active' && (
        active.length === 0 ? (
          <EmptyState icon={<Car size={48} />} title="No active deliveries" body="Accept a pending request to start earning." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.map((d: any) => {
              const tm     = TYPE_META[d.delivery_type] ?? TYPE_META.standard;
              const isBusy = busy === d.id;
              const isAssigned  = d.status === 'assigned';
              const isInTransit = d.status === 'in_transit';
              return (
                <div key={d.id} style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ display: 'flex', color: tm.color }}>{tm.icon}</span>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>
                          {d.pickup_district} → {d.dropoff_district}
                        </p>
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                        {d.cargo_kg} kg {d.cargo_type ? `· ${d.cargo_type}` : ''} · ~{d.distance_km} km
                      </p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, flexShrink: 0,
                      background: isInTransit ? 'var(--color-harvest-bg)' : 'var(--color-sky-bg)',
                      color: isInTransit ? 'var(--color-harvest)' : 'var(--color-sky)',
                    }}>
                      {isInTransit ? 'In Transit' : 'Assigned'}
                    </span>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'var(--color-primary-bg)', borderRadius: 10, marginBottom: 12 }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
                      UGX {Number(d.driver_earnings ?? 0).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>Your earnings · paid after delivery confirmed</p>
                  </div>

                  {(d.pickup_location || d.dropoff_location) && (
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                      {isAssigned && <p style={{ margin: '0 0 2px', fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />Head to pickup:</p>}
                      {d.pickup_location && <p style={{ margin: '0 0 2px' }}>{d.pickup_location}, {d.pickup_district}</p>}
                      {isInTransit && d.dropoff_location && <p style={{ margin: '0 0 2px', fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 4 }}><Target size={11} />Deliver to:</p>}
                      {isInTransit && d.dropoff_location && <p style={{ margin: 0 }}>{d.dropoff_location}, {d.dropoff_district}</p>}
                    </div>
                  )}

                  {isAssigned && (
                    <button disabled={isBusy} onClick={() => updateDelivery(d.id, 'start_transit')}
                      style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: isBusy ? 'var(--color-surface-2)' : 'var(--color-harvest)', color: isBusy ? C.muted : '#fff', fontWeight: 700, fontSize: 14, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
                      {isBusy ? 'Updating…' : <><Package size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />Mark Cargo Picked Up</>}
                    </button>
                  )}
                  {isInTransit && (
                    <button disabled={isBusy} onClick={() => updateDelivery(d.id, 'complete')}
                      style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: isBusy ? 'var(--color-surface-2)' : '#7C3AED', color: isBusy ? C.muted : '#fff', fontWeight: 700, fontSize: 14, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
                      {isBusy ? 'Updating…' : <><CheckCircle2 size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />Mark Delivered</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── COMPLETED TAB ────────────────────────────────────────────────────── */}
      {tab === 'completed' && (
        completed.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={48} />} title="No completed deliveries yet" body="Your delivery history will appear here." />
        ) : (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
            {completed.map((d: any, i: number) => {
              const tm   = TYPE_META[d.delivery_type] ?? TYPE_META.standard;
              const paid = d.payment_status === 'paid';
              return (
                <div key={d.id} style={{ padding: '14px 18px', borderBottom: i < completed.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ display: 'flex', color: tm.color }}>{tm.icon}</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                        {d.pickup_district} → {d.dropoff_district}
                      </p>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      {d.cargo_kg} kg · {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.green, margin: '0 0 2px' }}>
                      UGX {Number(d.driver_earnings ?? 0).toLocaleString()}
                    </p>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: paid ? 'var(--color-success-bg)' : 'var(--color-harvest-bg)', color: paid ? 'var(--color-success)' : 'var(--color-harvest)' }}>
                      {paid ? <><CheckCircle2 size={10} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 2 }} />Paid</> : 'Awaiting payment'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.muted }}>{icon}</div>
      <p style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 13, color: C.muted }}>{body}</p>
    </div>
  );
}
