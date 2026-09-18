'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Leaf, ClipboardList, CheckCircle2, Truck, Package, Star, X, AlertTriangle, FileText, Check, Info, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  blue: 'var(--color-sky)', blueBg: 'var(--color-sky-bg)',
  red: 'var(--color-danger)', redBg: 'var(--color-danger-bg)',
  purple: 'var(--color-purple)', purpleBg: 'var(--color-purple-bg)',
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
  disputed_at: string | null;
  return_requested_at: string | null;
  created_at: string;
  farmer: { full_name: string; location: string } | null;
};

const STEPS = [
  { key: 'pending',    label: 'Placed',     icon: <ClipboardList size={11} /> },
  { key: 'confirmed',  label: 'Confirmed',  icon: <CheckCircle2 size={11} /> },
  { key: 'paid',       label: 'Paid',       icon: <CheckCircle2 size={11} /> },
  { key: 'dispatched', label: 'Driver',     icon: <Truck size={11} /> },
  { key: 'in_transit', label: 'On the way', icon: <Truck size={11} /> },
  { key: 'delivered',  label: 'Delivered',  icon: <Package size={11} /> },
  { key: 'completed',  label: 'Done',       icon: <Star size={11} /> },
];

const STEP_IDX: Record<string, number> = {
  pending: 0, confirmed: 1, paid: 2, dispatched: 3, in_transit: 4, delivered: 5, completed: 6,
  cancelled: -1, disputed: 5,
};

function returnWindowMs(deliveredAt: string | null): number {
  if (!deliveredAt) return Infinity;
  return 48 * 60 * 60 * 1000 - (Date.now() - new Date(deliveredAt).getTime());
}

function ReturnCountdown({ deliveredAt }: { deliveredAt: string | null }) {
  const [ms, setMs] = React.useState(() => returnWindowMs(deliveredAt));
  React.useEffect(() => {
    const t = setInterval(() => setMs(returnWindowMs(deliveredAt)), 60_000);
    return () => clearInterval(t);
  }, [deliveredAt]);

  if (!deliveredAt || ms <= 0) {
    return (
      <p style={{ fontSize: 11, color: C.red, margin: 0, fontWeight: 600 }}>
        Return window expired
      </p>
    );
  }
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <p style={{ fontSize: 11, color: C.amber, margin: 0, fontWeight: 600 }}>
      Return window: {h}h {m}m left
    </p>
  );
}

function getStepStatusGuidance(status: string, farmerName: string | null, totalAmount: number, cropType: string) {
  switch (status) {
    case 'pending':
      return {
        badge: 'Step 1 of 6 · Placed',
        title: `Waiting for ${farmerName || 'Farmer'} to confirm stock`,
        desc: `The order for ${cropType} has been placed. The farmer is currently reviewing inventory. Once confirmed, you can securely fund escrow to dispatch delivery.`,
        bg: 'var(--color-sky-bg)',
        border: 'var(--color-sky)',
        color: 'var(--color-sky)',
      };
    case 'confirmed':
      return {
        badge: 'Step 2 of 6 · Stock Confirmed',
        title: 'Action Required: Pay Escrow to Dispatch Delivery',
        desc: `${farmerName || 'The farmer'} has confirmed available stock! Tap below to secure UGX ${Math.round(totalAmount).toLocaleString()} in Cropify Escrow. A nearby driver will be matched immediately.`,
        bg: 'var(--color-primary-bg)',
        border: 'var(--color-primary)',
        color: 'var(--color-primary)',
      };
    case 'paid':
      return {
        badge: 'Step 3 of 6 · Payment Secured in Escrow',
        title: 'Matching Nearby Driver...',
        desc: `UGX ${Math.round(totalAmount).toLocaleString()} is safely locked in escrow. The system has notified nearby transporters to accept the pickup job.`,
        bg: 'var(--color-primary-bg)',
        border: 'var(--color-primary)',
        color: 'var(--color-primary)',
      };
    case 'dispatched':
      return {
        badge: 'Step 4 of 6 · Driver Assigned',
        title: 'Driver En Route to Farm Pickup',
        desc: 'A transporter has accepted this delivery job and is heading to the pickup location to load your cargo.',
        bg: 'var(--color-sky-bg)',
        border: 'var(--color-sky)',
        color: 'var(--color-sky)',
      };
    case 'in_transit':
      return {
        badge: 'Step 5 of 6 · Cargo On The Way',
        title: 'Cargo In Transit with Live GPS',
        desc: `Your ${cropType} is loaded and on the road! The driver is broadcasting live location and ETA updates.`,
        bg: 'var(--color-harvest-bg)',
        border: 'var(--color-harvest)',
        color: 'var(--color-harvest)',
      };
    case 'delivered':
      return {
        badge: 'Step 6 of 6 · Delivered',
        title: 'Action Required: Inspect & Confirm Receipt',
        desc: `Cargo has arrived! Please inspect your ${cropType}. When satisfied, tap 'Confirm Receipt' to release funds to ${farmerName || 'the farmer'}. You have 48 hours to raise any quality dispute.`,
        bg: 'var(--color-harvest-bg)',
        border: 'var(--color-harvest)',
        color: 'var(--color-harvest)',
      };
    case 'completed':
      return {
        badge: 'Completed · Escrow Released',
        title: 'Order Successfully Completed',
        desc: `Payment of UGX ${Math.round(totalAmount).toLocaleString()} has been released to ${farmerName || 'the farmer'}. Thank you for trading on Cropify!`,
        bg: 'var(--color-success-bg)',
        border: 'var(--color-success)',
        color: 'var(--color-success)',
      };
    case 'disputed':
      return {
        badge: 'Dispute Under Review · Escrow Frozen',
        title: 'Escrow Protected — Moderation Team Arbitrating',
        desc: `You raised a dispute regarding produce quality on this order. Your funds are safely held in Cropify Escrow. The arbitration team is reviewing the claim with ${farmerName || 'the seller'}. You will be notified immediately upon resolution.`,
        bg: 'var(--color-danger-bg)',
        border: 'var(--color-danger-border)',
        color: 'var(--color-danger)',
      };
    default:
      return null;
  }
}

function Pipeline({ status }: { status: string }) {
  const cur = STEP_IDX[status] ?? 0;
  if (status === 'cancelled') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
      <X size={14} style={{ color: C.red, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Order Cancelled</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'auto', padding: '12px 0 8px' }}>
      {STEPS.map((s, i) => {
        const done    = i < cur;
        const active  = i === cur;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: active ? 32 : 26, height: active ? 32 : 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
                background: done ? C.green : active ? C.green : 'var(--color-surface-2)',
                border: active ? `2px solid ${C.green}` : done ? 'none' : `1.5px solid ${C.border}`,
                boxShadow: active ? `0 0 0 4px ${C.greenBg}` : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? (
                  <span style={{ display: 'flex', color: '#fff' }}><Check size={11} /></span>
                ) : (
                  <span style={{ display: 'flex', color: active ? '#fff' : 'var(--color-text-muted)' }}>{s.icon}</span>
                )}
              </div>
              <span style={{
                fontSize: active ? 10 : 9,
                color: active ? C.green : done ? C.greenMed : C.muted,
                fontWeight: active ? 800 : done ? 700 : 400,
                whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: done ? C.green : 'var(--color-surface-2)',
                transition: 'background 0.3s',
                margin: '0 4px',
                marginBottom: 18,
              }} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
        {ok ? <CheckCircle2 size={16} /> : <X size={16} />}
        {msg}
      </div>
    </div>
  );
}

function OrderCard({ order, onAction }: { order: Order; onAction: () => void }) {
  const [pending, startT] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
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

  async function payNow() {
    startT(async () => {
      const res = await fetch('/api/wallet/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fund', orderId: order.id }),
      });
      const json = await res.json();
      if (json.success) { showToast('Payment secured — arranging a driver now', true); onAction(); }
      else showToast(json.error ?? 'Payment failed', false);
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

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('poor_quality');
  const [disputeNote, setDisputeNote] = useState('');

  async function submitDispute() {
    startT(async () => {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispute',
          reason: disputeReason,
          note: disputeNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowDisputeModal(false);
        showToast(
          json.sellerSuspended
            ? 'Dispute submitted. Seller reached 3 quality strikes and has been temporarily suspended.'
            : 'Dispute submitted — Cropify support team will review within 24 hours.',
          true
        );
        onAction();
      } else {
        showToast(json.error ?? 'Failed to submit dispute', false);
      }
    });
  }

  const canCancel   = ['pending', 'confirmed', 'paid'].includes(order.status);
  const canPay      = order.status === 'confirmed';
  const canComplete = order.status === 'delivered';
  const withinReturnWindow = order.delivered_at
    ? Date.now() - new Date(order.delivered_at).getTime() < 48 * 60 * 60 * 1000
    : false;
  const canDispute  = order.status === 'delivered' && withinReturnWindow;

  return (
    <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden', marginBottom: 14 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Leaf size={22} style={{ color: getCropColor(order.crop_type) }} />
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
              {order.status === 'confirmed' && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: C.greenBg, color: C.green }}>
                  Payment due
                </span>
              )}
              {order.status === 'disputed' && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: C.redBg, color: C.red }}>
                  Dispute in review
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
        {order.status === 'delivered' && (
          <div style={{ paddingBottom: 8 }}>
            <ReturnCountdown deliveredAt={order.delivered_at} />
          </div>
        )}
        {order.status === 'disputed' && (
          <p style={{ fontSize: 11, color: C.red, fontWeight: 600, paddingBottom: 8, margin: 0 }}>
            Dispute in review — admin will resolve within 24 hours
          </p>
        )}
      </div>

      {/* Dynamic Step Guidance Explainer */}
      {(() => {
        const guide = getStepStatusGuidance(order.status, farmer?.full_name ?? null, order.total_amount, order.crop_type);
        if (!guide) return null;
        return (
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{
              background: guide.bg,
              border: `1px solid ${guide.border}`,
              borderRadius: 12,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: guide.color,
                }}>
                  {guide.badge}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: guide.color }}>
                  {order.status === 'confirmed' || order.status === 'delivered' ? '⚡ ACTION NEEDED' : 'IN PROGRESS'}
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 3px' }}>
                {guide.title}
              </p>
              <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                {guide.desc}
              </p>
            </div>
          </div>
        );
      })()}

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

      {/* Receipt link for completed orders */}
      {order.status === 'completed' && (
        <div style={{ padding: '0 20px 14px' }}>
          <Link
            href={`/buyer/orders/${order.id}/receipt`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              width: '100%', padding: '10px', borderRadius: 12,
              border: `1px solid ${C.border}`, background: C.greenBg,
              color: C.green, fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}
          >
            <FileText size={14} style={{ flexShrink: 0 }} /> Download Receipt / Invoice
          </Link>
        </div>
      )}

      {/* Actions */}
      {(canPay || canComplete || canCancel || canDispute) && (
        <div style={{ padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {canPay && (
            <button
              onClick={payNow}
              disabled={pending}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: pending ? C.greenBg : C.green, color: pending ? C.green : '#fff',
                fontSize: 13, fontWeight: 700, cursor: pending ? 'wait' : 'pointer',
              }}
            >
              {pending ? 'Processing…' : `Pay UGX ${Math.round(order.total_amount).toLocaleString()} — Arrange Delivery`}
            </button>
          )}
          {canComplete && (
            <button
              onClick={confirmReceipt}
              disabled={pending}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: pending ? C.amberBg : C.amber, color: pending ? C.amber : '#fff',
                fontSize: 13, fontWeight: 700, cursor: pending ? 'wait' : 'pointer',
              }}
            >
              {pending ? 'Confirming…' : 'Confirm Receipt — Release Payment'}
            </button>
          )}
          {canDispute && (
            <button
              onClick={() => setShowDisputeModal(true)}
              disabled={pending}
              style={{
                width: '100%', padding: '10px', borderRadius: 12, border: `1.5px solid ${C.red}`,
                background: 'transparent', color: C.red, fontSize: 13, fontWeight: 600,
                cursor: pending ? 'wait' : 'pointer',
              }}
            >
              {pending ? '…' : 'There is a problem — Raise Dispute'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={cancelOrder}
              disabled={pending}
              style={{
                padding: '10px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.red, fontSize: 13, fontWeight: 600,
                cursor: pending ? 'wait' : 'pointer',
              }}
            >
              Cancel Order
            </button>
          )}
        </div>
      )}

      {/* Structured Dispute & Quality Reporting Modal */}
      {showDisputeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowDisputeModal(false)}>
          <div style={{
            background: C.cardBg, borderRadius: 16, maxWidth: 480, width: '100%',
            padding: 22, boxShadow: 'var(--d-shadow-card)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
                  Raise Dispute & Report Quality
                </h3>
                <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>
                  Order #{order.id.slice(0, 8)} · {order.crop_type} ({order.quantity_kg} kg)
                </p>
              </div>
              <button onClick={() => setShowDisputeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--color-danger-bg)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, border: `1px solid var(--color-danger-border)` }}>
              <p style={{ fontSize: 11.5, color: C.red, margin: 0, lineHeight: 1.45, fontWeight: 600 }}>
                Escrow funds will remain safely frozen while Cropify investigates. Sellers reported 3 times for poor quality goods are automatically flagged and temporarily suspended.
              </p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>
                Complaint Reason *
              </label>
              <select
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                className="app-input"
                style={{ width: '100%', fontSize: 13, cursor: 'pointer' }}
              >
                <option value="poor_quality">Substandard / Rotten / Bad Produce</option>
                <option value="under_grade">Under-Grade (Doesn't match advertised quality grade)</option>
                <option value="damaged_produce">Damaged in Transit / Crushed Goods</option>
                <option value="weight_shortage">Weight Shortage / Incomplete Delivery</option>
                <option value="wrong_item">Wrong Crop / Variety Delivered</option>
                <option value="other">Other Transaction Issue</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>
                Problem Description & Evidence Details
              </label>
              <textarea
                value={disputeNote}
                onChange={e => setDisputeNote(e.target.value)}
                placeholder="Describe the issue in detail (e.g., discoloration, mold, moisture, weight received). You can also upload photos in Support."
                rows={3}
                className="app-input"
                style={{ width: '100%', fontSize: 12.5, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={submitDispute}
                disabled={pending}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: 13, background: C.red, borderColor: C.red }}
              >
                {pending ? 'Submitting…' : 'Submit Dispute & Freeze Escrow'}
              </button>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                disabled={pending}
                className="btn-ghost"
                style={{ padding: '10px 16px', fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderLifecycleExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: C.cardBg,
      borderRadius: 16,
      boxShadow: C.cardShadow,
      border: `1.5px solid ${C.border}`,
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '13px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--color-primary-bg)', color: C.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Info size={15} />
          </span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>
              Order Lifecycle Guide: How All Steps Finish
            </p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
              Placed → Confirmed → Paid → Driver → On the way → Delivered
            </p>
          </div>
        </div>
        <span style={{ color: C.muted, display: 'flex' }}>
          {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </span>
      </button>

      {open && (
        <div style={{ padding: '4px 18px 18px', borderTop: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {[
              { step: '1. Placed', who: 'Buyer', badgeBg: 'var(--color-sky-bg)', badgeCol: 'var(--color-sky)', desc: 'Buyer selects kilograms (e.g. 50 kg rice) and submits order. Farmer Kwagala Elijah receives immediate push/in-app alert.' },
              { step: '2. Confirmed', who: 'Farmer', badgeBg: 'var(--color-primary-bg)', badgeCol: 'var(--color-primary)', desc: 'Farmer inspects Kampala storage/farm and taps "Confirm Order" to guarantee stock.' },
              { step: '3. Paid', who: 'Buyer', badgeBg: 'var(--color-primary-bg)', badgeCol: 'var(--color-primary)', desc: 'Buyer taps "Pay UGX 100,000 — Arrange Delivery". Payment is locked in Cropify Escrow with 100% money-back protection.' },
              { step: '4. Driver', who: 'System & Transporter', badgeBg: 'var(--color-sky-bg)', badgeCol: 'var(--color-sky)', desc: 'System automatically dispatches to vetted local transporters. Transporter accepts the job and heads to pickup.' },
              { step: '5. On the way', who: 'Driver', badgeBg: 'var(--color-harvest-bg)', badgeCol: 'var(--color-harvest)', desc: 'Transporter picks up rice from Kampala and turns on live GPS tracking. Buyer watches arrival ETA in real time.' },
              { step: '6. Delivered', who: 'Driver & Buyer', badgeBg: 'var(--color-harvest-bg)', badgeCol: 'var(--color-harvest)', desc: 'Driver marks cargo delivered. Buyer receives delivery alert and has a 48-hour return/inspection window.' },
              { step: '7. Done', who: 'Buyer & Escrow', badgeBg: 'var(--color-success-bg)', badgeCol: 'var(--color-success)', desc: 'Buyer taps "Confirm Receipt", Cropify instantly releases UGX 100,000 to Kwagala Elijah, and an official receipt is issued.' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: item.badgeBg,
                  color: item.badgeCol,
                  whiteSpace: 'nowrap',
                  marginTop: 1,
                  flexShrink: 0,
                }}>
                  {item.step}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>
                    {item.who} · <span style={{ fontWeight: 400, color: C.muted }}>{item.desc}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_TABS = [
  { label: 'All',       filter: null },
  { label: 'Active',    filter: ['pending','confirmed','paid','dispatched','in_transit'] },
  { label: 'Delivered', filter: ['delivered'] },
  { label: 'Done',      filter: ['completed'] },
  { label: 'Disputed',  filter: ['disputed'] },
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

  const activeCount    = orders.filter(o => ['pending','confirmed','paid','dispatched','in_transit'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalSpend     = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
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

      {/* Order Lifecycle Guide */}
      <OrderLifecycleExplainer />

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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Package size={48} style={{ color: C.muted }} /></div>
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
