'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { DeliveryType, FareBreakdown } from '@/lib/delivery-pricing';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', card: 'var(--d-card)',
};

const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara',
  'Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi',
  'Mityana','Nakaseke','Rakai','Lyantonde','Ntungamo','Isingiro','Kiruhura','Bushenyi',
];

const DELIVERY_TYPES: { type: DeliveryType; icon: string; label: string; subtitle: string; color: string; bg: string; border: string }[] = [
  {
    type: 'standard', icon: '🚛', label: 'Standard',
    subtitle: '2–5 days · Lowest price',
    color: 'var(--color-primary)', bg: 'var(--color-primary-bg)', border: 'var(--color-primary)',
  },
  {
    type: 'fast', icon: '⚡', label: 'Fast Delivery',
    subtitle: 'Same day – 24 hrs',
    color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', border: 'var(--color-harvest)',
  },
  {
    type: 'cold', icon: '❄️', label: 'Cold Chain',
    subtitle: '1–3 days · Refrigerated',
    color: '#0EA5E9', bg: '#E0F2FE', border: '#0EA5E9',
  },
];

interface Props {
  prefilledOffer: { id: string; crop_type: string; quantity_kg: number; district: string } | null;
  successRedirect?: string;
}

export function RequestDeliveryForm({ prefilledOffer, successRedirect = '/buyer/deliveries' }: Props) {
  const router = useRouter();
  const [pickupDistrict, setPickupDistrict]   = useState(prefilledOffer?.district ?? '');
  const [pickupLocation, setPickupLocation]   = useState('');
  const [dropoffDistrict, setDropoffDistrict] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cargoKg, setCargoKg]                 = useState(prefilledOffer?.quantity_kg?.toString() ?? '');
  const [cargoType, setCargoType]             = useState(prefilledOffer?.crop_type ?? '');
  const [pickupDate, setPickupDate]           = useState('');
  const [notes, setNotes]                     = useState('');
  const [deliveryType, setDeliveryType]       = useState<DeliveryType>('standard');
  const [fare, setFare]                       = useState<FareBreakdown | null>(null);
  const [fareLoading, setFareLoading]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [submitted, setSubmitted]             = useState(false);

  // Live fare estimate — re-fetches whenever route, cargo, or type changes
  const fetchFare = useCallback(async () => {
    if (!pickupDistrict || !dropoffDistrict || !cargoKg || parseFloat(cargoKg) <= 0) {
      setFare(null); return;
    }
    setFareLoading(true);
    try {
      const res  = await fetch(`/api/deliveries/fare?from=${encodeURIComponent(pickupDistrict)}&to=${encodeURIComponent(dropoffDistrict)}&kg=${cargoKg}&type=${deliveryType}`);
      const json = await res.json();
      if (json.fare) setFare(json.fare);
    } catch { /* ignore */ } finally {
      setFareLoading(false);
    }
  }, [pickupDistrict, dropoffDistrict, cargoKg, deliveryType]);

  useEffect(() => {
    const id = setTimeout(fetchFare, 400); // debounce 400ms
    return () => clearTimeout(id);
  }, [fetchFare]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pickupDistrict || !dropoffDistrict || !cargoKg || !pickupDate) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id:         prefilledOffer?.id ?? null,
          pickup_district:  pickupDistrict,
          pickup_location:  pickupLocation || pickupDistrict,
          dropoff_district: dropoffDistrict,
          dropoff_location: dropoffLocation || dropoffDistrict,
          cargo_kg:         parseFloat(cargoKg),
          cargo_type:       cargoType || null,
          pickup_date:      pickupDate,
          notes:            notes || null,
          delivery_type:    deliveryType,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to post delivery');
      setSubmitted(true);
      setTimeout(() => { router.push(successRedirect); router.refresh(); }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>✅</p>
        <p style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 6 }}>Delivery Posted!</p>
        <p style={{ fontSize: 13, color: C.muted }}>Finding available drivers near you…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Prefilled offer banner */}
      {prefilledOffer && (
        <div style={{ padding: '11px 14px', background: 'var(--color-primary-bg)', borderRadius: 10, border: '1px solid var(--color-primary-muted)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)', margin: 0 }}>
            ✓ Linked deal: {prefilledOffer.crop_type} · {prefilledOffer.quantity_kg} kg
          </p>
        </div>
      )}

      {/* ── Delivery type selector ──────────────────────────────────────────── */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 10 }}>
          Delivery Type *
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {DELIVERY_TYPES.map(dt => {
            const selected = deliveryType === dt.type;
            return (
              <button
                key={dt.type}
                type="button"
                onClick={() => setDeliveryType(dt.type)}
                style={{
                  padding: '12px 8px',
                  borderRadius: 12,
                  border: `2px solid ${selected ? dt.border : C.border}`,
                  background: selected ? dt.bg : 'var(--d-input-bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <p style={{ fontSize: 22, margin: '0 0 4px' }}>{dt.icon}</p>
                <p style={{ fontSize: 12, fontWeight: 800, color: selected ? dt.color : C.text, margin: '0 0 2px' }}>
                  {dt.label}
                </p>
                <p style={{ fontSize: 10, fontWeight: 500, color: C.muted, margin: 0, lineHeight: 1.3 }}>
                  {dt.subtitle}
                </p>
              </button>
            );
          })}
        </div>
        {deliveryType === 'cold' && (
          <p style={{ fontSize: 11, color: '#0EA5E9', marginTop: 7, fontWeight: 600 }}>
            ❄️ Only refrigerated vehicles will be matched for cold chain deliveries
          </p>
        )}
      </div>

      {/* ── Route ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Pickup District *</label>
          <select value={pickupDistrict} onChange={e => setPickupDistrict(e.target.value)}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: pickupDistrict ? C.text : C.muted, background: 'var(--d-input-bg)' }}>
            <option value="">Select...</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Dropoff District *</label>
          <select value={dropoffDistrict} onChange={e => setDropoffDistrict(e.target.value)}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: dropoffDistrict ? C.text : C.muted, background: 'var(--d-input-bg)' }}>
            <option value="">Select...</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Pickup Location</label>
          <input type="text" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="Village, road, landmark..."
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Dropoff Location</label>
          <input type="text" value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} placeholder="Market, warehouse, address..."
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* ── Cargo ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Cargo Weight (kg) *</label>
          <input type="number" value={cargoKg} onChange={e => setCargoKg(e.target.value)} placeholder="e.g. 500" min="1"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Cargo Type</label>
          <input type="text" value={cargoType} onChange={e => setCargoType(e.target.value)} placeholder="e.g. Maize, Coffee"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Pickup Date *</label>
        <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Notes <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Access instructions, special handling requirements..."
          rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>

      {/* ── Live fare estimate ──────────────────────────────────────────────── */}
      {(fare || fareLoading) && (
        <div style={{
          padding: '16px 18px', borderRadius: 14,
          background: fareLoading ? 'var(--d-input-bg)' : 'var(--color-primary-bg)',
          border: `1px solid ${fareLoading ? C.border : 'var(--color-primary-muted)'}`,
        }}>
          {fareLoading ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Calculating fare…</p>
          ) : fare && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Estimated Fare</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
                  UGX {fare.totalFare.toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: C.muted }}>
                <span>📍 Distance: ~{fare.distanceKm} km</span>
                <span>⏱ ETA: {fare.etaLabel}</span>
                <span>🚛 Driver earns: UGX {fare.driverEarnings.toLocaleString()}</span>
                <span>💼 App commission: UGX {fare.commissionAmount.toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 10, color: C.muted, margin: '8px 0 0', borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                Final price is fixed — no negotiation. Driver is paid after you confirm delivery.
              </p>
            </>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>⚠ {error}</p>}

      <button type="submit" disabled={loading}
        style={{ padding: '14px', background: loading ? 'var(--color-surface-2)' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Posting…' : 'Post Delivery Request →'}
      </button>
    </form>
  );
}
