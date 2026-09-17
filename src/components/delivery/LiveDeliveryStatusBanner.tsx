'use client';

import { useState, useEffect } from 'react';
import { Truck, Navigation, Radio, CheckCircle, Clock, Phone, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import { TrackDeliveryButton } from './TrackDeliveryButton';
import { getTelUri, openPhoneDialer, formatPhoneDisplay } from '@/lib/phone-dialer';

interface Props {
  delivery: {
    id: string;
    status: string;
    pickup_district: string;
    dropoff_district: string;
    pickup_location?: string | null;
    dropoff_location?: string | null;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    dropoff_lat?: number | null;
    dropoff_lng?: number | null;
    cargo_type?: string | null;
    cargo_kg?: number | null;
    created_at?: string;
  };
  transporter?: {
    full_name?: string | null;
    phone_number?: string | null;
  } | null;
  vehicle?: {
    vehicle_type?: string | null;
    plate_number?: string | null;
    make_model?: string | null;
    is_cold_capable?: boolean;
  } | null;
  photoUrl?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LiveDeliveryStatusBanner({ delivery, transporter, vehicle, photoUrl }: Props) {
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Timer for search duration when status is 'open'
  useEffect(() => {
    if (delivery.status !== 'open') return;
    const start = delivery.created_at ? new Date(delivery.created_at).getTime() : Date.now();
    const tick = () => {
      const sec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsedSec(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [delivery.status, delivery.created_at]);

  // Poll driver position to update ETA banner live
  useEffect(() => {
    if (!['assigned', 'in_transit'].includes(delivery.status) || !transporter) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/deliveries/${delivery.id}/location`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.location) return;

        const loc = json.location;
        const targetLat = delivery.status === 'in_transit' ? (delivery.dropoff_lat ?? 0.3476) : (delivery.pickup_lat ?? 0.3476);
        const targetLng = delivery.status === 'in_transit' ? (delivery.dropoff_lng ?? 32.5825) : (delivery.pickup_lng ?? 32.5825);

        if (targetLat && targetLng && loc.lat && loc.lng) {
          const km = haversineKm(loc.lat, loc.lng, targetLat, targetLng);
          setDistanceKm(km);
          // Urban/rural blended ~35 km/h
          const mins = Math.max(1, Math.round((km / 35) * 60));
          setEtaMin(mins);
        }
      } catch {}
    }

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [delivery, transporter]);

  const driverFirstName = transporter?.full_name?.split(' ')[0] || 'Captain';

  // Format search elapsed time: e.g. 0:42
  const formattedSearchTime = `${Math.floor(elapsedSec / 60)}:${(elapsedSec % 60).toString().padStart(2, '0')}`;

  // 1. STAGE: SEARCHING / GETTING CAPTAIN
  if (delivery.status === 'open') {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #18281F 0%, #0F1A14 100%)',
          borderRadius: 16,
          padding: '16px 18px',
          color: '#FFFFFF',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 10px #10B981',
                animation: 'cropify-live-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 900, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Getting Captain Near You
            </span>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 999 }}>
            ⏱ {formattedSearchTime}
          </span>
        </div>

        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: '#F3F4F6' }}>
          Searching for nearest available captain in {delivery.pickup_district}…
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.4 }}>
          Your request is broadcast to all active trucks & drivers. You will be alerted the second a captain accepts.
        </p>
      </div>
    );
  }

  // 2. STAGE: CAPTAIN ASSIGNED / COMING TO PICKUP
  if (delivery.status === 'assigned' && transporter) {
    const isImminent = etaMin !== null && etaMin <= 2;
    return (
      <div
        style={{
          background: isImminent ? 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)' : 'linear-gradient(135deg, #0F172A 0%, #0B132B 100%)',
          borderRadius: 16,
          padding: '16px 18px',
          color: '#FFFFFF',
          border: isImminent ? '1.5px solid #10B981' : '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 8px 26px rgba(0,0,0,0.3)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#38BDF8',
                boxShadow: '0 0 10px #38BDF8',
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 900, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Captain Heading to Pickup
            </span>
          </div>
          {etaMin !== null && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                padding: '3px 10px',
                borderRadius: 999,
                background: isImminent ? '#10B981' : '#F59E0B',
                color: isImminent ? '#FFFFFF' : '#0F172A',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {etaMin <= 1 ? 'Reaches in 1 min' : `Reaches in ${etaMin} min`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, margin: 0, color: '#FFFFFF' }}>
              Captain {driverFirstName} is on the way
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>
              {vehicle?.make_model ? `${vehicle.make_model} · ` : ''}{vehicle?.plate_number || 'Vehicle assigned'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {transporter.phone_number && (
              <a
                href={getTelUri(transporter.phone_number)}
                onClick={(e) => openPhoneDialer(transporter.phone_number, e)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 12,
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(16,185,129,0.35)',
                  cursor: 'pointer',
                }}
                title={`Call Captain: ${formatPhoneDisplay(transporter.phone_number)}`}
              >
                <Phone size={14} /> Call Captain
              </a>
            )}

            <TrackDeliveryButton
              delivery={delivery}
              driver={{
                name: transporter.full_name ?? 'Captain',
                phone: transporter.phone_number,
                vehicleType: vehicle?.vehicle_type,
                plateNumber: vehicle?.plate_number,
                makeModel: vehicle?.make_model,
                isColdCapable: vehicle?.is_cold_capable,
                photoUrl,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 3. STAGE: IN TRANSIT / EN ROUTE TO DESTINATION
  if (delivery.status === 'in_transit' && transporter) {
    const isNearArrival = etaMin !== null && etaMin <= 2;
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #005C4B 0%, #00362C 100%)',
          borderRadius: 16,
          padding: '16px 18px',
          color: '#FFFFFF',
          border: '1.5px solid #00E5FF',
          boxShadow: '0 8px 30px rgba(0, 229, 255, 0.2)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#00E5FF',
                boxShadow: '0 0 10px #00E5FF',
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 900, color: '#00E5FF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Live In Transit to {delivery.dropoff_district}
            </span>
          </div>
          {etaMin !== null && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                padding: '3px 10px',
                borderRadius: 999,
                background: '#FBBF24',
                color: '#0F172A',
                boxShadow: '0 2px 10px rgba(251, 191, 36, 0.4)',
              }}
            >
              {etaMin <= 1 ? 'Reaches in 1 min' : `Reaches in ${etaMin} min`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, margin: 0, color: '#FFFFFF' }}>
              {isNearArrival ? `Captain ${driverFirstName} arrives any moment!` : `Captain ${driverFirstName} is rolling`}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '2px 0 0' }}>
              Moving {delivery.cargo_kg ? `${delivery.cargo_kg}kg · ` : ''}{delivery.cargo_type || 'Cargo'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {transporter.phone_number && (
              <a
                href={getTelUri(transporter.phone_number)}
                onClick={(e) => openPhoneDialer(transporter.phone_number, e)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 12,
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(16,185,129,0.35)',
                  cursor: 'pointer',
                }}
                title={`Call Captain: ${formatPhoneDisplay(transporter.phone_number)}`}
              >
                <Phone size={14} /> Call Captain
              </a>
            )}

            <TrackDeliveryButton
              delivery={delivery}
              driver={{
                name: transporter.full_name ?? 'Captain',
                phone: transporter.phone_number,
                vehicleType: vehicle?.vehicle_type,
                plateNumber: vehicle?.plate_number,
                makeModel: vehicle?.make_model,
                isColdCapable: vehicle?.is_cold_capable,
                photoUrl,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
