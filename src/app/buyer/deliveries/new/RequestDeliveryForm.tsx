'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type FormEvent, type ReactNode, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Zap, Snowflake, MapPin, Clock, CheckCircle2, Megaphone, AlertTriangle,
  ArrowLeft, ChevronRight, History, Pencil, Search, ChevronDown, Check, Loader2,
} from 'lucide-react';
import type { DeliveryType, FareBreakdown } from '@/lib/delivery-pricing';
import { NearbyDriversMap } from '@/components/delivery/NearbyDriversMap';
import { LocationPinPicker } from '@/components/delivery/LocationPinPicker';
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
    type: 'standard', icon: <Truck size={24} />, label: 'Standard',
    subtitle: '2–5 days · Lowest price',
    color: 'var(--color-primary)', bg: 'var(--color-primary-bg)', border: 'var(--color-primary)',
  },
  {
    type: 'fast', icon: <Zap size={24} />, label: 'Fast Delivery',
    subtitle: 'Same day – 24 hrs',
    color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', border: 'var(--color-harvest)',
  },
  {
    type: 'cold', icon: <Snowflake size={24} />, label: 'Cool Transport',
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

/**
 * Modern, popup-free inline searchable district combobox.
 * Floats an inline menu directly below the selector instead of opening an intrusive modal bottom sheet.
 */
function InlineDistrictSelect({
  value,
  onChange,
  placeholder,
  districts,
  dotColor,
  dotShape = 'circle',
  pinButton,
}: {
  value: string;
  onChange: (d: string) => void;
  placeholder: string;
  districts: string[];
  dotColor: string;
  dotShape?: 'circle' | 'square';
  pinButton?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return districts;
    return districts.filter(d => d.toLowerCase().includes(q));
  }, [search, districts]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => { setIsOpen(prev => !prev); setSearch(''); }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 12px',
            borderRadius: 11,
            border: isOpen ? '1.5px solid var(--color-primary)' : '1px solid #e4e8e1',
            background: '#f7f8f6',
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: 0,
            boxShadow: isOpen ? '0 0 0 3px rgba(22, 107, 58, 0.12)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: dotShape === 'circle' ? '50%' : 2,
            background: dotColor,
            flexShrink: 0,
          }} />
          <span style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 14,
            fontWeight: 700,
            color: value ? '#182018' : '#6b7566',
          }}>
            {value || placeholder}
          </span>
          <ChevronDown size={15} style={{
            color: '#6b7566',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }} />
        </button>
        {pinButton}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 800,
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e4e8e1',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          padding: 8,
          maxHeight: 250,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7566',
            }} />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter district..."
              style={{
                width: '100%',
                padding: '8px 10px 8px 30px',
                fontSize: 13,
                border: '1px solid #e4e8e1',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
                background: '#fbfcfb',
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: '#6b7566' }}>
                No districts match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map(d => {
                const selected = d.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      onChange(d);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: selected ? 'var(--color-primary-bg)' : 'transparent',
                      color: selected ? 'var(--color-primary)' : '#182018',
                      fontWeight: selected ? 800 : 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => {
                      if (!selected) (e.currentTarget as HTMLElement).style.background = '#f4f6f2';
                    }}
                    onMouseLeave={e => {
                      if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span>{d}</span>
                    {selected && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RequestDeliveryForm({ prefilledOffer, successRedirect = '/buyer/deliveries', userDistrict, requesterRole }: Props) {
  const router = useRouter();
  const [pickupDistrict, setPickupDistrict]   = useState(prefilledOffer?.district ?? userDistrict ?? '');
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
  const [driversNotified, setDriversNotified] = useState<number | null>(null);

  // Map-first flow: a live "drivers near you" screen is step one.
  // Pickup and drop-off districts are chosen inline seamlessly without popup sheets.
  const [step, setStep]                       = useState<'map' | 'details'>('map');
  const [recentPickup, setRecentPickup]       = useState<string[]>([]);
  const [recentDropoff, setRecentDropoff]     = useState<string[]>([]);

  // Exact coordinates (optional fine-tuning if user clicks the pin icon)
  const [pickupPin, setPickupPin]             = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffPin, setDropoffPin]           = useState<{ lat: number; lng: number } | null>(null);
  const [showPickupPin, setShowPickupPin]     = useState(false);
  const [showDropoffPin, setShowDropoffPin]   = useState(false);

  useEffect(() => {
    fetch('/api/deliveries/recent-destinations')
      .then(res => res.json())
      .then(json => {
        setRecentPickup(json.pickup ?? []);
        setRecentDropoff(json.dropoff ?? []);
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
    const id = setTimeout(fetchFare, 400);
    return () => clearTimeout(id);
  }, [fetchFare]);

  async function handleDirectSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pickupDistrict || !dropoffDistrict || !cargoKg || !pickupDate) {
      setError('Please fill all required fields');
      return;
    }
    if (!fare) {
      setError('Calculating route fare — please wait a moment');
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
          pickup_lat:       pickupPin?.lat ?? null,
          pickup_lng:       pickupPin?.lng ?? null,
          dropoff_district: dropoffDistrict,
          dropoff_location: dropoffLocation || dropoffDistrict,
          dropoff_lat:      dropoffPin?.lat ?? null,
          dropoff_lng:      dropoffPin?.lng ?? null,
          cargo_kg:         parseFloat(cargoKg),
          cargo_type:       cargoType || null,
          pickup_date:      pickupDate,
          notes:            notes || null,
          delivery_type:    deliveryType,
          requester_role:   requesterRole ?? null,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to post delivery');

      setDriversNotified(json.driversNotified ?? 0);
      setSubmitted(true);
      setTimeout(() => {
        router.push(successRedirect);
        router.refresh();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while requesting delivery.');
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
            ? <CheckCircle2 size={52} style={{ color: 'var(--color-success)' }} />
            : <Megaphone size={52} style={{ color: 'var(--color-harvest)' }} />}
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 19, color: C.text, margin: '0 0 8px' }}>Delivery Requested!</h2>
        {hasDrivers ? (
          <p style={{ fontSize: 14, color: 'var(--color-success)', fontWeight: 600, maxWidth: 440, margin: '0 auto 12px' }}>
            {driversNotified} driver{driversNotified === 1 ? '' : 's'} operating near {pickupDistrict} have been alerted and can respond immediately.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-harvest)', fontWeight: 600, margin: '0 0 6px' }}>
              Your request is live for all transporters in the network.
            </p>
            <p style={{ fontSize: 13, color: C.muted, maxWidth: 420, margin: '0 auto 12px' }}>
              Drivers browsing the haulage board will see your route from {pickupDistrict} to {dropoffDistrict}.
            </p>
          </>
        )}
        <p style={{ fontSize: 12, color: C.muted }}>Redirecting to your deliveries list...</p>
      </div>
    );
  }

  // Step 1: Live nearby drivers map with clean inline destination selectors
  if (step === 'map') {
    const bothSet = !!pickupDistrict && !!dropoffDistrict;
    return (
      <div>
        <div style={{ position: 'relative', margin: '-24px -24px 0', borderRadius: 16, overflow: 'hidden', height: 'clamp(560px, 92vh, 900px)' }}>
          <NearbyDriversMap userDistrict={pickupDistrict || userDistrict} height="100%" />

          <button type="button" onClick={() => router.back()} aria-label="Back" style={{
            position: 'absolute', top: 14, left: 14, zIndex: 600, width: 38, height: 38, borderRadius: '50%',
            border: 'none', cursor: 'pointer', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ArrowLeft size={18} style={{ color: '#182018' }} />
          </button>

          {/* Floating Control Card: completely inline, NO popup sheets */}
          <div style={{
            position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 600,
            background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.22)', padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Inline Pickup District Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7566', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                Pickup District
              </label>
              <InlineDistrictSelect
                value={pickupDistrict}
                onChange={(d) => {
                  setPickupDistrict(d);
                  setPickupPin(null);
                }}
                placeholder="Select pickup district"
                districts={DISTRICTS}
                dotColor="var(--color-primary)"
                dotShape="circle"
                pinButton={
                  pickupDistrict ? (
                    <button
                      type="button"
                      onClick={() => setShowPickupPin(true)}
                      title="Adjust exact pickup GPS pin"
                      style={{
                        flexShrink: 0, width: 40, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 11, border: '1px solid #e4e8e1',
                        background: pickupPin ? 'var(--color-primary-bg)' : '#f7f8f6', cursor: 'pointer',
                      }}
                    >
                      <MapPin size={16} style={{ color: pickupPin ? 'var(--color-primary)' : '#6b7566' }} />
                    </button>
                  ) : undefined
                }
              />
            </div>

            {/* Inline Drop-off District Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7566', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                Drop-off District
              </label>
              <InlineDistrictSelect
                value={dropoffDistrict}
                onChange={(d) => {
                  setDropoffDistrict(d);
                  setDropoffPin(null);
                }}
                placeholder="Select drop-off district"
                districts={DISTRICTS}
                dotColor="var(--color-danger)"
                dotShape="square"
                pinButton={
                  dropoffDistrict ? (
                    <button
                      type="button"
                      onClick={() => setShowDropoffPin(true)}
                      title="Adjust exact drop-off GPS pin"
                      style={{
                        flexShrink: 0, width: 40, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 11, border: '1px solid #e4e8e1',
                        background: dropoffPin ? 'var(--color-primary-bg)' : '#f7f8f6', cursor: 'pointer',
                      }}
                    >
                      <MapPin size={16} style={{ color: dropoffPin ? 'var(--color-primary)' : '#6b7566' }} />
                    </button>
                  ) : undefined
                }
              />

              {/* Quick Recent Destination Chips — 1-tap selection without ANY popup */}
              {recentDropoff.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7566', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <History size={11} /> Recent:
                  </span>
                  {recentDropoff.slice(0, 4).map(d => (
                    <button
                      key={`recent-chip-${d}`}
                      type="button"
                      onClick={() => {
                        setDropoffDistrict(d);
                        setDropoffPin(null);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: dropoffDistrict.toLowerCase() === d.toLowerCase() ? 'var(--color-primary-bg)' : '#f2f4ef',
                        color: dropoffDistrict.toLowerCase() === d.toLowerCase() ? 'var(--color-primary)' : '#182018',
                        border: `1px solid ${dropoffDistrict.toLowerCase() === d.toLowerCase() ? 'var(--color-primary)' : '#e4e8e1'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {bothSet ? (
              <button
                type="button"
                onClick={() => setStep('details')}
                style={{
                  padding: '13px', borderRadius: 11, border: 'none', background: 'var(--color-primary)',
                  color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Continue to Trip Details <ChevronRight size={16} />
              </button>
            ) : (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7566', textAlign: 'center', fontWeight: 500 }}>
                Choose pickup &amp; drop-off districts above to continue
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e4e8e1', background: 'transparent',
                  color: '#182018', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {prefilledOffer && (
          <div style={{ marginTop: 14, padding: '11px 14px', background: 'var(--color-primary-bg)', borderRadius: 10, border: '1px solid var(--color-primary-muted)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)', margin: 0 }}>
              <CheckCircle2 size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
              Linked deal: {prefilledOffer.crop_type} · {prefilledOffer.quantity_kg} kg — pickup district set to {prefilledOffer.district}
            </p>
          </div>
        )}

        {/* Optional fine-tuning pin picker: ONLY opens when user explicitly clicks the small pin icon */}
        {pickupDistrict && showPickupPin && (
          <LocationPinPicker
            open={showPickupPin}
            onClose={() => setShowPickupPin(false)}
            onConfirm={(pos) => { setPickupPin(pos); setShowPickupPin(false); }}
            onSkip={() => setShowPickupPin(false)}
            title="Confirm exact pickup spot"
            district={pickupDistrict}
          />
        )}
        {dropoffDistrict && showDropoffPin && (
          <LocationPinPicker
            open={showDropoffPin}
            onClose={() => setShowDropoffPin(false)}
            onConfirm={(pos) => { setDropoffPin(pos); setShowDropoffPin(false); }}
            onSkip={() => setShowDropoffPin(false)}
            title="Confirm exact drop-off spot"
            district={dropoffDistrict}
          />
        )}
      </div>
    );
  }

  // Step 2: Trip & Cargo Details — submitted cleanly without popup sheets
  return (
    <form onSubmit={handleDirectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Route Header with quick change button back to map */}
      <button
        type="button"
        onClick={() => setStep('map')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 14px', borderRadius: 12,
          border: `1px solid ${C.border}`, background: 'var(--color-primary-bg)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <MapPin size={16} style={{ color: C.green, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.text }}>
          {pickupDistrict} → {dropoffDistrict}
        </span>
        <span style={{ fontSize: 12, color: C.green, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
          <Pencil size={12} /> Change Route
        </span>
      </button>

      {prefilledOffer && (
        <div style={{ padding: '11px 14px', background: 'var(--color-primary-bg)', borderRadius: 10, border: '1px solid var(--color-primary-muted)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)', margin: 0 }}>
            <CheckCircle2 size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
            Linked deal: {prefilledOffer.crop_type} · {prefilledOffer.quantity_kg} kg
          </p>
        </div>
      )}

      {/* Delivery Type Selection */}
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
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 8px', color: selected ? dt.color : C.muted }}>
                  {dt.icon}
                </div>
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
          <p style={{ fontSize: 11, color: '#0EA5E9', marginTop: 7, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Snowflake size={11} /> Only refrigerated vehicles will be matched for cool chain transport
          </p>
        )}
      </div>

      {/* Address Specifics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Pickup Location Address / Landmark
          </label>
          <input
            type="text"
            value={pickupLocation}
            onChange={e => setPickupLocation(e.target.value)}
            placeholder="Village, road, market..."
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Dropoff Location Address / Landmark
          </label>
          <input
            type="text"
            value={dropoffLocation}
            onChange={e => setDropoffLocation(e.target.value)}
            placeholder="Warehouse, store, street..."
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
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
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
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
            placeholder="e.g. Maize, Coffee, Tomatoes"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

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
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Special Instructions <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Access instructions, fragile cargo, contact person..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>

      {/* Inline Fare Breakdown & Driver Notification Info */}
      {(fare || fareLoading) && (
        <div style={{
          padding: '16px 18px', borderRadius: 14,
          background: fareLoading ? 'var(--d-input-bg)' : 'var(--color-primary-bg)',
          border: `1px solid ${fareLoading ? C.border : 'var(--color-primary-muted)'}`,
        }}>
          {fareLoading ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="animate-spin" /> Calculating route fare…
            </p>
          ) : fare && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Estimated Trip Fare</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Fixed platform rate based on weight &amp; distance</p>
                </div>
                <p style={{ fontSize: 20, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
                  UGX {fare.totalFare.toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} /> Distance: ~{fare.distanceKm} km
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> Estimated ETA: {fare.etaLabel}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-success)', margin: '8px 0 0', fontWeight: 600 }}>
                Every driver operating near {pickupDistrict} will be immediately notified to respond.
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      {/* Direct Submit: Seamless 1-click submission without popup modal */}
      <button
        type="submit"
        disabled={loading || !fare}
        style={{
          padding: '14px',
          background: (loading || !fare) ? 'var(--color-surface-2)' : C.green,
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
          'Calculating Fare…'
        )}
      </button>
    </form>
  );
}
