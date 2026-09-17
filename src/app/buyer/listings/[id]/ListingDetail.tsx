'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { type VerificationLevel } from '@/lib/trust';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { Leaf, CheckCircle2, X, MapPin, Package, Users, ShieldCheck, Star, ShoppingCart, Minus, Plus, Lock, ArrowRight } from 'lucide-react';

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

      {/* ── Buy Now section (Fintech Redesign) ─────────────────────────── */}
      {!disabled && (
        <div style={{
          background: C.cardBg,
          borderRadius: 20,
          boxShadow: C.cardShadow,
          padding: '22px 24px',
          border: '1.5px solid var(--d-border)',
          position: 'relative',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={15} style={{ color: C.green }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Buy Now · Escrow Checkout
              </p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
              background: 'var(--color-primary-bg)', color: C.green,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <ShieldCheck size={11} /> 100% Secure
            </span>
          </div>

          {/* Quantity Stepper & Direct Input */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label htmlFor="qty-stepper-input" style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                How many kilograms?
              </label>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: 6 }}>
                {listing.quantity_kg.toLocaleString()} kg available
              </span>
            </div>

            {/* Stepper Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--d-input-bg)',
              borderRadius: 14,
              padding: 4,
              border: `1.5px solid ${C.border}`,
            }}>
              <button
                type="button"
                onClick={() => applyQty(String(Math.max(1, qty - (qty > 20 ? 10 : 1))))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  border: 'none', background: qty <= 1 ? 'transparent' : 'var(--color-surface-2)',
                  color: qty <= 1 ? 'var(--color-text-muted)' : C.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <Minus size={18} />
              </button>

              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  id="qty-stepper-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={listing.quantity_kg}
                  value={qtyInput}
                  onChange={e => applyQty(e.target.value)}
                  onBlur={() => setQtyInput(String(qty))}
                  style={{
                    width: '100%', textAlign: 'center',
                    border: 'none', background: 'transparent',
                    fontSize: 22, fontWeight: 900, color: C.text,
                    outline: 'none', letterSpacing: '-0.02em',
                    padding: '8px 0',
                  }}
                />
                <span style={{ position: 'absolute', right: 12, fontSize: 13, fontWeight: 800, color: C.muted }}>
                  kg
                </span>
              </div>

              <button
                type="button"
                onClick={() => applyQty(String(Math.min(listing.quantity_kg, qty + (listing.quantity_kg - qty >= 10 ? 10 : 1))))}
                disabled={qty >= listing.quantity_kg}
                aria-label="Increase quantity"
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  border: 'none', background: qty >= listing.quantity_kg ? 'transparent' : 'var(--color-surface-2)',
                  color: qty >= listing.quantity_kg ? 'var(--color-text-muted)' : C.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: qty >= listing.quantity_kg ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Quick Pick Pills */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {[25, 50, 100, 250].filter(n => n < listing.quantity_kg).map(n => {
                const isActive = qty === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => applyQty(String(n))}
                    style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${isActive ? C.green : C.border}`,
                      background: isActive ? C.green : 'transparent',
                      color: isActive ? '#fff' : C.muted,
                      boxShadow: isActive ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {n} kg
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => applyQty(String(listing.quantity_kg))}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${qty === listing.quantity_kg ? C.green : C.border}`,
                  background: qty === listing.quantity_kg ? C.green : 'transparent',
                  color: qty === listing.quantity_kg ? '#fff' : C.muted,
                  boxShadow: qty === listing.quantity_kg ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                All ({listing.quantity_kg.toLocaleString()} kg)
              </button>
            </div>
          </div>

          {/* Transparent Cost Breakdown */}
          <div style={{
            background: 'var(--color-surface-2)',
            borderRadius: 14,
            padding: '16px 18px',
            marginBottom: 18,
            border: '1px solid var(--d-border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: C.muted }}>Subtotal ({qty} kg × UGX {Math.round(listing.asking_price).toLocaleString()})</span>
              <span style={{ fontWeight: 700, color: C.text }}>UGX {total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 13 }}>
              <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                Escrow Protection Fee
              </span>
              <span style={{ fontWeight: 700, color: C.green, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--color-primary-bg)', color: C.green }}>FREE</span>
                UGX 0
              </span>
            </div>
            <div style={{ height: 1, background: 'var(--d-border)', marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                  Total Amount Due
                </p>
                <p style={{ fontSize: 24, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
                  UGX {total.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>
                  {qty} kg × UGX {Math.round(listing.asking_price).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* High-Conversion Fintech CTA Button */}
          <button
            onClick={handleBuyNow}
            disabled={buyPending}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 14,
              border: 'none',
              background: buyPending ? 'var(--color-primary-hover)' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 900,
              cursor: buyPending ? 'wait' : 'pointer',
              letterSpacing: '-0.01em',
              transition: 'all 0.15s ease',
              boxShadow: '0 6px 20px rgba(22,163,74,0.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {buyPending ? (
              'Securing Order with Escrow…'
            ) : (
              <>
                <Lock size={17} />
                <span>Buy Now — Pay UGX {total.toLocaleString()} with Escrow</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Platform Guarantee & Escrow Terms ────────────────────────────── */}
      <div style={{
        background: 'var(--color-primary-bg)',
        borderRadius: 16,
        padding: '16px 20px',
        border: '1px solid var(--color-primary-border, rgba(34,197,94,0.25))',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ display: 'flex', flexShrink: 0, color: C.green, marginTop: 2 }}>
            <ShieldCheck size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>
              Cropify Bank-Grade Escrow Guarantee
            </p>
            <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.55 }}>
              Your funds remain securely locked in Cropify Escrow until you inspect the delivered produce. If quality does not match, return or dispute within <strong>48 hours</strong> for an instant full refund.
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
