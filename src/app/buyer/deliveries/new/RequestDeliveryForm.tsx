'use client';

import { useState, useEffect, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Zap, Snowflake, MapPin, Clock, CheckCircle2, Megaphone, AlertTriangle,
  Loader2,
} from 'lucide-react';
import { calcFare, type DeliveryType, type FareBreakdown } from '@/lib/delivery-pricing';
import { DISTRICT_NAMES } from '@/lib/districts';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', card: 'var(--d-card)',
};

const DISTRICTS = DISTRICT_NAMES && DISTRICT_NAMES.length > 0 ? DISTRICT_NAMES : [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara',
  'Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi',
  'Mityana','Nakaseke','Rakai','Lyantonde','Ntungamo','Isingiro','Kiruhura','Bushenyi',
];

const DELIVERY_TYPES: { type: DeliveryType; icon: JSX.Element; label: string; subtitle: string; color: string; bg: string; border: string }[] = [
  {
    type: 'standard', icon: <Truck size={22} />, label: 'Standard',
    subtitle: '2–5 days · Lowest price',
    color: 'var(--color-primary)', bg: 'var(--color-primary-bg)', border: 'var(--color-primary)',
  },
  {
    type: 'fast', icon: <Zap size={22} />, label: 'Fast Delivery',
    subtitle: 'Same day – 24 hrs',
    color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', border: 'var(--color-harvest)',
  },
  {
    type: 'cold', icon: <Snowflake size={22} />, label: 'Cool Transport',
    subtitle: '1–3 days · Refrigerated',
    color: '#0EA5E9', bg: '#E0F2FE', border: '#0EA5E9',
  },
];

interface Props {
  prefilledOffer: { id: string; crop_type: string; quantity_kg: number; district: string } | null;
  successRedirect?: string;
  userDistrict?: string;
  requesterRole?: string;
}

export function RequestDeliveryForm({ prefilledOffer, successRedirect = '/buyer/deliveries', userDistrict, requesterRole }: Props) {
  const router = useRouter();
  const [pickupDistrict, setPickupDistrict]   = useState(prefilledOffer?.district ?? userDistrict ?? 'Kampala');
  const [pickupLocation, setPickupLocation]   = useState('');
  const [dropoffDistrict, setDropoffDistrict] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cargoKg, setCargoKg]                 = useState(prefilledOffer?.quantity_kg?.toString() ?? '');
  const [cargoType, setCargoType]             = useState(prefilledOffer?.crop_type ?? '');
  const [pickupDate, setPickupDate]           = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]                     = useState('');
  const [deliveryType, setDeliveryType]       = useState<DeliveryType>('standard');
  const [fare, setFare]                       = useState<FareBreakdown | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [submitted, setSubmitted]             = useState(false);
  const [driversNotified, setDriversNotified] = useState<number | null>(null);

  // Instant client-side fare calculation (Zero 2G network roundtrip delay)
  useEffect(() => {
    if (!pickupDistrict || !dropoffDistrict || !cargoKg || parseFloat(cargoKg) <= 0) {
      setFare(null);
      return;
    }
    const cleanFrom = DISTRICTS.find(d => d.toLowerCase() === pickupDistrict.trim().toLowerCase()) ?? pickupDistrict.trim();
    const cleanTo = DISTRICTS.find(d => d.toLowerCase() === dropoffDistrict.trim().toLowerCase()) ?? dropoffDistrict.trim();
    try {
      const computedFare = calcFare(cleanFrom, cleanTo, parseFloat(cargoKg) || 1, deliveryType);
      setFare(computedFare);
    } catch {
      setFare(null);
    }
  }, [pickupDistrict, dropoffDistrict, cargoKg, deliveryType]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const from = pickupDistrict.trim();
    const to = dropoffDistrict.trim();

    if (!from) {
      setError('Please enter or select a pickup district');
      return;
    }
    if (!to) {
      setError('Please enter or select a drop-off district');
      return;
    }
    if (!cargoKg || parseFloat(cargoKg) <= 0) {
      setError('Please enter valid cargo weight (kg)');
      return;
    }
    if (!pickupDate) {
      setError('Please select a pickup date');
      return;
    }

    const cleanFrom = DISTRICTS.find(d => d.toLowerCase() === from.toLowerCase()) ?? from;
    const cleanTo = DISTRICTS.find(d => d.toLowerCase() === to.toLowerCase()) ?? to;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id:         prefilledOffer?.id ?? null,
          pickup_district:  cleanFrom,
          pickup_location:  pickupLocation || cleanFrom,
          dropoff_district: cleanTo,
          dropoff_location: dropoffLocation || cleanTo,
          cargo_kg:         parseFloat(cargoKg),
          cargo_type:       cargoType || null,
          pickup_date:      pickupDate,
          notes:            notes || null,
          delivery_type:    deliveryType,
          requester_role:   requesterRole ?? null,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to post delivery request');

      setDriversNotified(json.driversNotified ?? 0);
      setSubmitted(true);
      setTimeout(() => {
        router.push(successRedirect);
        router.refresh();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while posting delivery request.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const hasDrivers = driversNotified !== null && driversNotified > 0;
    return (
      <div style={{ textAlign: 'center', padding: '36px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {hasDrivers
            ? <CheckCircle2 size={56} style={{ color: 'var(--color-success)' }} />
            : <Megaphone size={56} style={{ color: 'var(--color-harvest)' }} />}
        </div>
        <h2 style={{ fontWeight: 900, fontSize: 20, color: C.text, margin: '0 0 8px' }}>Delivery Request Posted!</h2>
        {hasDrivers ? (
          <p style={{ fontSize: 14, color: 'var(--color-success)', fontWeight: 600, maxWidth: 460, margin: '0 auto 12px' }}>
            {driversNotified} driver{driversNotified === 1 ? '' : 's'} operating near {pickupDistrict} have been alerted and can accept your delivery.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-harvest)', fontWeight: 600, margin: '0 0 6px' }}>
              Your request is live for all transporters across Uganda.
            </p>
            <p style={{ fontSize: 13, color: C.muted, maxWidth: 440, margin: '0 auto 12px' }}>
              Drivers operating along the route between {pickupDistrict} and {dropoffDistrict} are being matched.
            </p>
          </>
        )}
        <p style={{ fontSize: 12, color: C.muted }}>Redirecting to your deliveries list…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hidden Datalist for District Autocomplete & Easy Typing */}
      <datalist id="uganda-districts-datalist">
        {DISTRICTS.map(d => (
          <option key={`dl-${d}`} value={d} />
        ))}
      </datalist>

      {prefilledOffer && (
        <div style={{ padding: '12px 14px', background: 'var(--color-primary-bg)', borderRadius: 10, border: '1px solid var(--color-primary-muted)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} />
            Linked deal: {prefilledOffer.crop_type} · {prefilledOffer.quantity_kg} kg — pickup set to {prefilledOffer.district}
          </p>
        </div>
      )}

      {/* Origin & Destination Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {/* Pickup District */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 6 }}>
            Pickup District (Where to collect) *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
            <input
              list="uganda-districts-datalist"
              type="text"
              value={pickupDistrict}
              onChange={e => setPickupDistrict(e.target.value)}
              placeholder="Type or select pickup district (e.g. Kampala)"
              required
              style={{
                width: '100%', padding: '13px 14px 13px 36px', borderRadius: 12,
                border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 600,
                background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <input
            type="text"
            value={pickupLocation}
            onChange={e => setPickupLocation(e.target.value)}
            placeholder="Specific pickup address / village / farm plot (optional)"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13, marginTop: 6,
              background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Dropoff District */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 6 }}>
            Drop-off District (Where to deliver) *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: 2, background: 'var(--color-danger)' }} />
            <input
              list="uganda-districts-datalist"
              type="text"
              value={dropoffDistrict}
              onChange={e => setDropoffDistrict(e.target.value)}
              placeholder="Type or select destination (e.g. Masaka, Jinja, Gulu)"
              required
              style={{
                width: '100%', padding: '13px 14px 13px 36px', borderRadius: 12,
                border: `1.5px solid ${dropoffDistrict ? 'var(--color-primary)' : C.border}`,
                fontSize: 14, fontWeight: 600,
                background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <input
            type="text"
            value={dropoffLocation}
            onChange={e => setDropoffLocation(e.target.value)}
            placeholder="Specific warehouse / landmark / contact person (optional)"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13, marginTop: 6,
              background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Delivery Type */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 8 }}>
          Delivery Speed & Type *
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
                  background: selected ? dt.bg : 'var(--d-input-bg, #fff)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 6px', color: selected ? dt.color : C.muted }}>
                  {dt.icon}
                </div>
                <p style={{ fontSize: 12, fontWeight: 800, color: selected ? dt.color : C.text, margin: '0 0 2px' }}>
                  {dt.label}
                </p>
                <p style={{ fontSize: 10, fontWeight: 500, color: C.muted, margin: 0, lineHeight: 1.2 }}>
                  {dt.subtitle}
                </p>
              </button>
            );
          })}
        </div>
        {deliveryType === 'cold' && (
          <p style={{ fontSize: 11, color: '#0EA5E9', marginTop: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Snowflake size={11} /> Refrigerated cold-chain transport matched for temperature-sensitive cargo
          </p>
        )}
      </div>

      {/* Cargo specifications */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Cargo Weight (kg) *
          </label>
          <input
            type="number"
            value={cargoKg}
            onChange={e => setCargoKg(e.target.value)}
            placeholder="e.g. 500"
            min="1"
            required
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 14, outline: 'none',
              boxSizing: 'border-box', background: 'var(--d-input-bg, #fff)', color: C.text,
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Produce / Cargo Description
          </label>
          <input
            type="text"
            value={cargoType}
            onChange={e => setCargoType(e.target.value)}
            placeholder="e.g. Coffee, Maize, Potatoes"
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
              boxSizing: 'border-box', background: 'var(--d-input-bg, #fff)', color: C.text,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Pickup Date *
          </label>
          <input
            type="date"
            value={pickupDate}
            onChange={e => setPickupDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 14, outline: 'none',
              boxSizing: 'border-box', background: 'var(--d-input-bg, #fff)', color: C.text,
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Instructions <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Handling notes..."
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
              boxSizing: 'border-box', background: 'var(--d-input-bg, #fff)', color: C.text,
            }}
          />
        </div>
      </div>

      {/* Live Route & Fare Calculation Card */}
      {fare && (
        <div style={{
          padding: '16px 18px', borderRadius: 14,
          background: 'var(--color-primary-bg)',
          border: '1.5px solid var(--color-primary-muted)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>Estimated Trip Fare</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                {pickupDistrict} → {dropoffDistrict}
              </p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
              UGX {fare.totalFare.toLocaleString()}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} /> Distance: ~{fare.distanceKm} km
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> Estimated ETA: {fare.etaLabel}
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--color-success)', margin: '8px 0 0', fontWeight: 600 }}>
            Every driver operating near {pickupDistrict} will be alerted immediately.
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
          <AlertTriangle size={15} /> {error}
        </p>
      )}

      {/* Direct Submit Action */}
      <button
        type="submit"
        disabled={loading || !fare}
        style={{
          padding: '15px',
          background: (loading || !fare) ? 'var(--color-surface-2, #ccc)' : C.green,
          color: (loading || !fare) ? C.muted : '#fff',
          border: 'none',
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 15,
          cursor: (loading || !fare) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: (loading || !fare) ? 'none' : '0 4px 14px rgba(22, 107, 58, 0.25)',
          transition: 'all 0.15s ease',
        }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Notifying Nearby Drivers…
          </>
        ) : fare ? (
          `Request Delivery Now · UGX ${fare.totalFare.toLocaleString()}`
        ) : (
          'Enter Drop-off & Cargo to Request Delivery'
        )}
      </button>
    </form>
  );
}
