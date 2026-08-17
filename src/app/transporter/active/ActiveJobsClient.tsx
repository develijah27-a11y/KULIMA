'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Zap, Snowflake, Radio, Car, CheckCircle2, Package, MapPin, Target, MessageSquare, AlertTriangle, Navigation2 } from 'lucide-react';
import { NavigateButton } from '@/components/delivery/NavigateButton';
import { ShareLocationButton } from '@/components/delivery/ShareLocationButton';
import { DriverTrackingSheet } from '@/components/delivery/DriverTrackingSheet';
import { DeliveryTrackingMap } from '@/components/delivery/DeliveryTrackingMap';
import { ShowPaymentQR } from '@/components/delivery/ShowPaymentQR';

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

const TAB_LABEL: Record<'pending' | 'active' | 'completed', string> = {
  pending:   'New Offers',
  active:    'In Progress',
  completed: 'Completed',
};

const TAB_HELP: Record<'pending' | 'active' | 'completed', string> = {
  pending:   'Jobs the system has matched to your vehicle — accept or decline before someone else takes them.',
  active:    "Jobs you've accepted and are currently picking up or delivering.",
  completed: "Jobs you've delivered. Payout status is shown on each one.",
};

export function ActiveJobsClient({ pending, active, completed }: Props) {
  const router = useRouter();
  const tabs   = ['pending', 'active', 'completed'] as const;
  const [tab, setTab]     = useState<typeof tabs[number]>(pending.length > 0 ? 'pending' : active.length > 0 ? 'active' : 'completed');
  const [busy, setBusy]   = useState<string | null>(null);
  const [error, setError] = useState('');
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const trackedDelivery = active.find((d: any) => d.id === trackingId) ?? null;

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
            }}>
            {TAB_LABEL[t]} {counts[t] > 0 && <span style={{ marginLeft: 3, background: 'rgba(255,255,255,0.25)', padding: '1px 5px', borderRadius: 99, fontSize: 10 }}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: C.muted, margin: '-8px 0 0' }}>{TAB_HELP[tab]}</p>

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
          <ActiveJobsList active={active} busy={busy} setTrackingId={setTrackingId} updateDelivery={updateDelivery} />
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
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.green, margin: '0 0 2px' }}>
                      UGX {Number(d.driver_earnings ?? 0).toLocaleString()}
                    </p>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: paid ? 'var(--color-success-bg)' : 'var(--color-harvest-bg)', color: paid ? 'var(--color-success)' : 'var(--color-harvest)' }}>
                      {paid ? <><CheckCircle2 size={10} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 2 }} />Paid</> : 'Awaiting payment'}
                    </span>
                    {!paid && <ShowPaymentQR deliveryId={d.id} amount={Number(d.driver_earnings ?? 0)} />}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {trackedDelivery && (
        <DriverTrackingSheet
          open={!!trackingId}
          onClose={() => setTrackingId(null)}
          delivery={trackedDelivery}
          otherParty={{
            name: trackedDelivery.requester?.full_name ?? 'Requester',
            phone: trackedDelivery.requester?.phone_number,
            role: 'requester',
          }}
        />
      )}
    </div>
  );
}

function ActiveJobGroup({ title, color, bg, children }: { title: string; color: string; bg: string; children: ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color, background: bg, display: 'inline-block', padding: '3px 10px', borderRadius: 999, marginBottom: 8 }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function ActiveJobsList({ active, busy, setTrackingId, updateDelivery }: {
  active: any[]; busy: string | null;
  setTrackingId: (id: string | null) => void;
  updateDelivery: (id: string, action: 'start_transit' | 'complete') => void;
}) {
  // Multiple accepted jobs can be scattered across different pickup points in
  // the same district — grouping by picked-up-or-not (rather than one flat
  // list) lets a driver see at a glance which stops are still owed a pickup
  // versus already loaded and en route.
  const pendingPickup = active.filter((d: any) => d.status === 'assigned');
  const pickedUp      = active.filter((d: any) => d.status === 'in_transit');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {pendingPickup.length > 0 && (
        <ActiveJobGroup title={`Pending Pickup (${pendingPickup.length})`} color="var(--color-sky)" bg="var(--color-sky-bg)">
          {pendingPickup.map((d: any) => (
            <ActiveJobCard key={d.id} d={d} busy={busy} setTrackingId={setTrackingId} updateDelivery={updateDelivery} />
          ))}
        </ActiveJobGroup>
      )}
      {pickedUp.length > 0 && (
        <ActiveJobGroup title={`Picked Up — In Transit (${pickedUp.length})`} color="var(--color-harvest)" bg="var(--color-harvest-bg)">
          {pickedUp.map((d: any) => (
            <ActiveJobCard key={d.id} d={d} busy={busy} setTrackingId={setTrackingId} updateDelivery={updateDelivery} />
          ))}
        </ActiveJobGroup>
      )}
    </div>
  );
}

function ActiveJobCard({ d, busy, setTrackingId, updateDelivery }: {
  d: any; busy: string | null;
  setTrackingId: (id: string | null) => void;
  updateDelivery: (id: string, action: 'start_transit' | 'complete') => void;
}) {
  const tm     = TYPE_META[d.delivery_type] ?? TYPE_META.standard;
  const isBusy = busy === d.id;
  const isAssigned  = d.status === 'assigned';
  const isInTransit = d.status === 'in_transit';

  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '18px 20px' }}>
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

      <div style={{ height: 190, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
        <DeliveryTrackingMap
          deliveryId={d.id}
          pickupDistrict={d.pickup_district}
          dropoffDistrict={d.dropoff_district}
          pickupCoords={d.pickup_lat != null && d.pickup_lng != null ? { lat: d.pickup_lat, lng: d.pickup_lng } : null}
          dropoffCoords={d.dropoff_lat != null && d.dropoff_lng != null ? { lat: d.dropoff_lat, lng: d.dropoff_lng } : null}
          otherPartyLabel={d.requester?.full_name ?? 'Requester'}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <NavigateButton
          deliveryId={d.id}
          fallbackAddress={
            isInTransit
              ? `${d.dropoff_location ?? ''}, ${d.dropoff_district}`
              : `${d.pickup_location ?? ''}, ${d.pickup_district}`
          }
          exactCoords={
            isInTransit
              ? (d.dropoff_lat != null && d.dropoff_lng != null ? { lat: d.dropoff_lat, lng: d.dropoff_lng } : null)
              : (d.pickup_lat != null && d.pickup_lng != null ? { lat: d.pickup_lat, lng: d.pickup_lng } : null)
          }
        />
      </div>

      {/* Broadcasting is automatic once a job is accepted — matches
          the expected default for a driver, not an opt-in toggle */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <ShareLocationButton deliveryId={d.id} active autoStart label="location visible to requester" />
        {d.requester && (
          <button
            onClick={() => setTrackingId(d.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: 'var(--color-sky-bg, #E0F2FE)', color: 'var(--color-sky, #0EA5E9)',
            }}
          >
            <Navigation2 size={13} /> View live map
          </button>
        )}
      </div>

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
