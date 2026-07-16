'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { type VerificationLevel } from '@/lib/trust';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { Leaf, CheckCircle2, X, MapPin, Package, Users, ShieldCheck, Star, ShoppingCart } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  red: 'var(--color-danger)', redBg: 'var(--color-danger-bg)',
};

interface Props {
  listing: {
    id: string;
    crop_type: string;
    quantity_kg: number;
    asking_price: number;
    district: string;
    available_from: string;
    notes: string | null;
    quality_grade: string | null;
    farmer: {
      full_name: string;
      location: string;
      verification_level: string | null;
      trust_score: number | null;
    };
  };
  farmerId: string;
  isFavourited: boolean;
  marketPrice: number | null;
  existingOffer: { id: string; offered_price: number; status: string } | null;
  hasActiveOrder: boolean;
  gradient: { from: string; to: string };
  photoUrl: string | null;
  cropColor: string;
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 280, maxWidth: 360,
      background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      animation: 'fadeInUp 0.25s ease',
    }}>
      {ok ? <CheckCircle2 size={18} /> : <X size={18} />}
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{msg}</p>
    </div>
  );
}


export function ListingDetail({
  listing, farmerId, isFavourited, marketPrice, existingOffer, hasActiveOrder,
  gradient, photoUrl, cropColor,
}: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(Math.min(50, listing.quantity_kg));
  const [qtyInput, setQtyInput] = useState(String(Math.min(50, listing.quantity_kg)));
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [buyPending, startBuy] = useTransition();

  const total = Math.round(qty * listing.asking_price);

  function applyQty(raw: string) {
    setQtyInput(raw);
    const n = Math.floor(Number(raw));
    if (Number.isFinite(n) && n > 0) {
      setQty(Math.min(n, listing.quantity_kg));
    }
  }
  const priceDelta = marketPrice ? Math.round(((listing.asking_price - marketPrice) / marketPrice) * 100) : null;
  const farmer = listing.farmer ?? {};

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleBuyNow() {
    startBuy(async () => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, quantityKg: qty }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Order placed! Farmer will confirm shortly.', true);
        setTimeout(() => router.push('/buyer/orders'), 1800);
      } else {
        showToast(json.error ?? 'Failed to place order', false);
      }
    });
  }

  const disabled = hasActiveOrder || existingOffer?.status === 'pending';

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', position: 'relative', height: 220,
        background: photoUrl
          ? `url(${photoUrl}) center/cover`
          : `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
        boxShadow: C.cardShadow,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />
        {!photoUrl && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={72} style={{ color: 'rgba(255,255,255,0.85)', filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.3))' }} />
          </div>
        )}
        {/* Badge */}
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(6px)' }}>
            {listing.quantity_kg.toLocaleString()} kg available
          </span>
        </div>
        {/* Bottom text */}
        <div style={{ position: 'absolute', bottom: 16, left: 20 }}>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 22, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)', textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
            {listing.crop_type}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />{listing.district}
            {listing.quality_grade && ` · Grade ${listing.quality_grade}`}
          </p>
        </div>
      </div>

      {/* ── Price + Farmer ───────────────────────────────────────────────── */}
      <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 28, fontWeight: 900, color: cropColor, margin: 0, letterSpacing: '-0.03em' }}>
              UGX {Math.round(listing.asking_price).toLocaleString()}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>per kg · fixed price set by the farmer</p>
          </div>
          {priceDelta !== null && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
              background: Math.abs(priceDelta) <= 10 ? C.greenBg : C.amberBg,
              color: Math.abs(priceDelta) <= 10 ? C.green : C.amber,
            }}>
              {priceDelta >= 0 ? '+' : ''}{priceDelta}% vs market
            </span>
          )}
        </div>

        {/* Farmer info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
            {farmer.full_name?.[0]?.toUpperCase() ?? 'F'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{farmer.full_name ?? 'Farmer'}</p>
              {farmer.verification_level && (
                <VerificationBadge level={farmer.verification_level as VerificationLevel} size="xs" showLabel={false} />
              )}
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>
              {farmer.location ?? listing.district}
              {farmer.trust_score ? <> · <Star size={10} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> {farmer.trust_score.toFixed(1)} trust</> : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {listing.available_from && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Available</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.text, margin: '1px 0 0' }}>
                  {new Date(listing.available_from).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            )}
            <FavouriteButton kind="farmer" targetId={farmerId} initialFavourited={isFavourited} size={22} />
          </div>
        </div>

        {listing.notes && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: C.greenBg, borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: C.greenMed, margin: 0, fontStyle: 'italic' }}>"{listing.notes}"</p>
          </div>
        )}
      </div>

      {/* ── Already ordered / offered ────────────────────────────────────── */}
      {(hasActiveOrder || existingOffer) && (
        <div style={{ background: C.amberBg, borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', color: C.amber }}>{hasActiveOrder ? <Package size={20} /> : <Users size={20} />}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.amber, margin: 0 }}>
              {hasActiveOrder ? 'You have an active order for this listing' : `Offer sent · UGX ${existingOffer?.offered_price?.toLocaleString()}/kg`}
            </p>
            <p style={{ fontSize: 11, color: C.amber, margin: '2px 0 0', opacity: 0.8 }}>
              {hasActiveOrder ? 'Track it in My Orders' : 'Waiting for farmer to respond'}
            </p>
          </div>
        </div>
      )}

      {/* ── Buy Now section ──────────────────────────────────────────────── */}
      {!disabled && (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '20px 22px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Buy Now
          </p>

          {/* Quantity — typed amount, not a slider: precise on the first try,
              especially for large bulk orders where dragging a slider to an
              exact number is fiddly. */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.muted }}>How many kilograms?</span>
              <span style={{ fontSize: 11, color: C.muted }}>{listing.quantity_kg.toLocaleString()} kg available</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={listing.quantity_kg}
                value={qtyInput}
                onChange={e => applyQty(e.target.value)}
                onBlur={() => setQtyInput(String(qty))}
                style={{
                  width: '100%', padding: '14px 52px 14px 16px', borderRadius: 12,
                  border: `1.5px solid ${C.border}`, fontSize: 20, fontWeight: 800,
                  color: C.text, background: 'var(--d-input-bg)',
                  boxSizing: 'border-box', outline: 'none', letterSpacing: '-0.02em',
                }}
              />
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: C.muted }}>
                kg
              </span>
            </div>
            {/* Quick picks */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[25, 50, 100, 250].filter(n => n < listing.quantity_kg).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => applyQty(String(n))}
                  style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${qty === n ? 'transparent' : C.border}`,
                    background: qty === n ? C.green : 'transparent',
                    color: qty === n ? '#fff' : C.muted,
                  }}
                >
                  {n} kg
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyQty(String(listing.quantity_kg))}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${qty === listing.quantity_kg ? 'transparent' : C.border}`,
                  background: qty === listing.quantity_kg ? C.green : 'transparent',
                  color: qty === listing.quantity_kg ? '#fff' : C.muted,
                }}
              >
                All ({listing.quantity_kg.toLocaleString()} kg)
              </button>
            </div>
          </div>

          {/* Total */}
          <div style={{ background: C.greenBg, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, color: C.greenMed, margin: 0 }}>Total amount</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: C.green, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                UGX {total.toLocaleString()}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: C.greenMed, margin: 0 }}>{qty} kg</p>
              <p style={{ fontSize: 11, color: C.greenMed, margin: '2px 0 0' }}>× UGX {Math.round(listing.asking_price).toLocaleString()}</p>
            </div>
          </div>

          <button
            onClick={handleBuyNow}
            disabled={buyPending}
            style={{
              width: '100%', padding: '15px 20px', borderRadius: 13, border: 'none',
              background: buyPending ? 'var(--color-primary-hover)' : C.green,
              color: '#fff', fontSize: 16, fontWeight: 800, cursor: buyPending ? 'wait' : 'pointer',
              letterSpacing: '-0.01em', transition: 'transform 0.1s, opacity 0.1s',
              boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
            }}
          >
            {buyPending ? 'Placing order…' : <><ShoppingCart size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />Buy Now — UGX {total.toLocaleString()}</>}
          </button>
        </div>
      )}

      {/* ── Platform guarantee ───────────────────────────────────────────── */}
      <div style={{ background: C.greenBg, borderRadius: 14, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ display: 'flex', flexShrink: 0, color: '#065F46' }}><ShieldCheck size={18} /></span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: 0 }}>AgriNova Buyer Protection</p>
            <p style={{ fontSize: 11, color: '#065F46', margin: '3px 0 0', opacity: 0.85 }}>
              Funds are held in escrow until you confirm receipt. Quality disputes handled within 48 hours.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
