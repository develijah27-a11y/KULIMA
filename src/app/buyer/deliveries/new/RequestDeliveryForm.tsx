'use client';

import { useState, useEffect, useCallback, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Zap, Snowflake, MapPin, Clock, CheckCircle2, Megaphone, AlertTriangle,
  History, Loader2, Navigation,
} from 'lucide-react';
import type { DeliveryType, FareBreakdown } from '@/lib/delivery-pricing';
import { NearbyDriversMap } from '@/components/delivery/NearbyDriversMap';
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
  const [fareLoading, setFareLoading]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [submitted, setSubmitted]             = useState(false);
  const [driversNotified, setDriversNotified] = useState<number | null>(null);
  const [recentDropoff, setRecentDropoff]     = useState<string[]>([]);
  const [showLiveMap, setShowLiveMap]         = useState(false);

  useEffect(() => {
    fetch('/api/deliveries/recent-destinations')
      .then(res => res.json())
      .then(json => {
        setRecentDropoff(json.dropoff ?? []);
        if (!dropoffDistrict && json.dropoff && json.dropoff.length > 0) {
          // Keep dropoff empty by default so user explicitly chooses, but recent chips are ready
        }
      })
      .catch(() => {});
  }, []);

  const fetchFare = useCallback(async () => {
    if (!pickupDistrict || !dropoffDistrict || !cargoKg || parseFloat(cargoKg) <= 0) {
      setFare(null);
      return;
    }
    setFareLoading(true);
    try {
      const res = await fetch(`/api/deliveries/fare?from=${encodeURIComponent(pickupDistrict)}&to=${encodeURIComponent(dropoffDistrict)}&kg=${cargoKg}&type=${deliveryType}`);
      const json = await res.json();
      if (json.fare) setFare(json.fare);
    } catch {
      /* ignore */
    } finally {
      setFareLoading(false);
    }
  }, [pickupDistrict, dropoffDistrict, cargoKg, deliveryType]);

  useEffect(() => {
    const id = setTimeout(fetchFare, 350);
    return () => clearTimeout(id);
  }, [fetchFare]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pickupDistrict) {
      setError('Please select a pickup district');
      return;
    }
    if (!dropoffDistrict) {
      setError('Please select a drop-off district');
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
    if (!fare) {
      setError('Calculating fare — please wait a moment');
      return;
    }

    setLoading(true);
    setError('');

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
      }, 3200);
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
            {driversNotified} driver{driversNotified === 1 ? '' : 's'} operating near {pickupDistrict} have been alerted and can respond immediately.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-harvest)', fontWeight: 600, margin: '0 0 6px' }}>
              Your request is live for all transporters across the platform.
            </p>
            <p style={{ fontSize: 13, color: C.muted, maxWidth: 440, margin: '0 auto 12px' }}>
              Drivers browsing the haulage board will see your route from {pickupDistrict} to {dropoffDistrict}.
            </p>
          </>
        )}
        <p style={{ fontSize: 12, color: C.muted }}>Redirecting to your deliveries list...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            Pickup District *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-primary)' }} />
            <select
              value={pickupDistrict}
              onChange={e => setPickupDistrict(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px 12px 32px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 600,
                background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
                boxSizing: 'border-box', cursor: 'pointer',
              }}
            >
              <option value="">Select pickup district</option>
              {DISTRICTS.map(d => (
                <option key={`pickup-${d}`} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={pickupLocation}
            onChange={e => setPickupLocation(e.target.value)}
            placeholder="Specific pickup address / village / landmark (optional)"
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
            Drop-off District *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: 2, background: 'var(--color-danger)' }} />
            <select
              value={dropoffDistrict}
              onChange={e => setDropoffDistrict(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px 12px 32px', borderRadius: 10,
                border: `1.5px solid ${dropoffDistrict ? 'var(--color-primary)' : C.border}`,
                fontSize: 14, fontWeight: 600,
                background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
                boxSizing: 'border-box', cursor: 'pointer',
              }}
            >
              <option value="">Select drop-off district</option>
              {DISTRICTS.map(d => (
                <option key={`dropoff-${d}`} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={dropoffLocation}
            onChange={e => setDropoffLocation(e.target.value)}
            placeholder="Specific drop-off address / warehouse / street (optional)"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13, marginTop: 6,
              background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Quick Recent Destination Chips */}
          {recentDropoff.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                <History size={11} /> Recent:
              </span>
              {recentDropoff.slice(0, 5).map(d => (
                <button
                  key={`recent-chip-${d}`}
                  type="button"
                  onClick={() => setDropoffDistrict(d)}
                  style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: dropoffDistrict.toLowerCase() === d.toLowerCase() ? 'var(--color-primary-bg)' : 'var(--color-surface-2, #f0f2ee)',
                    color: dropoffDistrict.toLowerCase() === d.toLowerCase() ? 'var(--color-primary)' : C.text,
                    border: `1px solid ${dropoffDistrict.toLowerCase() === d.toLowerCase() ? 'var(--color-primary)' : C.border}`,
                    cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Type */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 8 }}>
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
            Cargo Description
          </label>
          <input
            type="text"
            value={cargoType}
            onChange={e => setCargoType(e.target.value)}
            placeholder="e.g. Maize, Coffee, Irish Potatoes"
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
            Notes <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Handling instructions..."
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
              boxSizing: 'border-box', background: 'var(--d-input-bg, #fff)', color: C.text,
            }}
          />
        </div>
      </div>

      {/* Live Route & Fare Calculation Card */}
      {(fare || fareLoading) && (
        <div style={{
          padding: '16px 18px', borderRadius: 14,
          background: fareLoading ? 'var(--d-input-bg)' : 'var(--color-primary-bg)',
          border: `1.5px solid ${fareLoading ? C.border : 'var(--color-primary-muted)'}`,
        }}>
          {fareLoading ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} className="animate-spin" /> Calculating route fare…
            </p>
          ) : fare && (
            <>
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
                Every driver in the system operating near {pickupDistrict} will be alerted immediately.
              </p>
            </>
          )}
        </div>
      )}

      {/* Optional Live Driver Map Preview toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowLiveMap(prev => !prev)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: C.green, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, padding: 0,
          }}
        >
          <Navigation size={13} /> {showLiveMap ? 'Hide nearby drivers map' : 'Preview live drivers near pickup on map'}
        </button>
        {showLiveMap && (
          <div style={{ height: 260, borderRadius: 12, overflow: 'hidden', marginTop: 10, border: `1px solid ${C.border}` }}>
            <NearbyDriversMap userDistrict={pickupDistrict} height="100%" />
          </div>
        )}
      </div>

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
          padding: '14px',
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
