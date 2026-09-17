'use client';

import { useState, useEffect, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Zap, Snowflake, MapPin, Clock, CheckCircle2, Megaphone, AlertTriangle,
  Loader2, ShoppingBag, ArrowRight, Repeat, Sparkles, Store, Lock, ShieldCheck,
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

const POPULAR_DISTRICTS = ['Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Masaka', 'Mbarara', 'Gulu', 'Mbale'];

type ServiceMode = 'delivery' | 'shop_pickup' | 'combined';

const SERVICE_MODES: { mode: ServiceMode; title: string; subtitle: string; icon: JSX.Element; badge?: string }[] = [
  {
    mode: 'delivery',
    title: 'Produce Delivery',
    subtitle: 'Send harvest/crops from your farm to a buyer or market',
    icon: <Truck size={20} />,
  },
  {
    mode: 'shop_pickup',
    title: 'Store / Input Pickup',
    subtitle: 'Driver collects seeds, fertilizer or tools from agro-shop & brings them to your farm',
    icon: <ShoppingBag size={20} />,
    badge: 'Popular',
  },
  {
    mode: 'combined',
    title: 'Combined: Delivery + Pickup',
    subtitle: 'Deliver your crops to market & return with farm inputs on the same trip',
    icon: <Repeat size={20} />,
    badge: 'Save 30%',
  },
];

const COMMON_INPUTS = [
  'NPK 17:17:17 Fertilizer',
  'DAP Planting Fertilizer',
  'Urea Top-Dressing',
  'Hybrid Maize Seed (Longe 5)',
  'Certified Bean Seeds',
  '16L Knapsack Sprayer',
  'Pesticide / Fungicide Pack',
  'Animal & Dairy Feed',
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

  // Service mode state
  const [serviceMode, setServiceMode] = useState<ServiceMode>('delivery');

  // Input pickup specific details
  const [shopName, setShopName] = useState('');
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [customInputNotes, setCustomInputNotes] = useState('');

  // Routing & Cargo
  const [pickupDistrict, setPickupDistrict]   = useState(prefilledOffer?.district ?? userDistrict ?? 'Kampala');
  const [pickupLocation, setPickupLocation]   = useState('');
  const [dropoffDistrict, setDropoffDistrict] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cargoKg, setCargoKg]                 = useState(prefilledOffer?.quantity_kg?.toString() ?? '100');
  const [cargoType, setCargoType]             = useState(prefilledOffer?.crop_type ?? '');
  const [pickupDate, setPickupDate]           = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]                     = useState('');
  const [deliveryType, setDeliveryType]       = useState<DeliveryType>('standard');
  const [fare, setFare]                       = useState<FareBreakdown | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [submitted, setSubmitted]             = useState(false);
  const [driversNotified, setDriversNotified] = useState<number | null>(null);

  // Toggle quick input chips
  const toggleInputChip = (item: string) => {
    setSelectedInputs(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  // Instant client-side fare calculation (Zero 2G network roundtrip delay)
  useEffect(() => {
    if (!pickupDistrict || !dropoffDistrict || !cargoKg || parseFloat(cargoKg) <= 0) {
      setFare(null);
      return;
    }
    const cleanFrom = DISTRICTS.find(d => d.toLowerCase() === pickupDistrict.trim().toLowerCase()) ?? pickupDistrict.trim();
    const cleanTo = DISTRICTS.find(d => d.toLowerCase() === dropoffDistrict.trim().toLowerCase()) ?? dropoffDistrict.trim();
    try {
      let computedFare = calcFare(cleanFrom, cleanTo, parseFloat(cargoKg) || 1, deliveryType);
      // If combined service mode, apply multi-stop trip adjustment
      if (serviceMode === 'combined') {
        const combinedFare = Math.round(computedFare.totalFare * 1.35); // 35% add-on instead of double trip
        computedFare = {
          ...computedFare,
          totalFare: combinedFare,
          driverEarnings: Math.round(computedFare.driverEarnings * 1.35),
        };
      }
      setFare(computedFare);
    } catch {
      setFare(null);
    }
  }, [pickupDistrict, dropoffDistrict, cargoKg, deliveryType, serviceMode]);

  // Recommended vehicle capacity based on weight
  const recommendedVehicle = (() => {
    const kg = parseFloat(cargoKg) || 0;
    if (kg <= 40) return { name: 'Boda-Boda (Motorcycle)', icon: '🏍️', badge: 'Fastest & Lightest' };
    if (kg <= 800) return { name: 'Pickup Truck / Minivan', icon: '🛻', badge: 'Optimal for Farm Loads' };
    return { name: 'Heavy Truck / 3-Ton Lorry', icon: '🚚', badge: 'High-Capacity Cargo' };
  })();

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

    // Compose consolidated cargo description & notes based on service mode
    let consolidatedCargo = cargoType || '';
    if (serviceMode === 'shop_pickup') {
      const items = [...selectedInputs, customInputNotes].filter(Boolean).join(', ');
      consolidatedCargo = items ? `Input Pickup: ${items}` : 'Farm Inputs & Seeds Pickup';
    } else if (serviceMode === 'combined') {
      const items = [...selectedInputs, customInputNotes].filter(Boolean).join(', ');
      consolidatedCargo = `${cargoType || 'Produce Delivery'} + Return Pickup: ${items || 'Agro-Inputs'}`;
    }

    const compiledNotes = [
      serviceMode !== 'delivery' ? `[SERVICE MODE: ${serviceMode.toUpperCase().replace('_', ' ')}]` : '',
      shopName ? `Agro-Shop Location: ${shopName}` : '',
      notes ? `Instructions: ${notes}` : '',
    ].filter(Boolean).join(' · ');

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id:         prefilledOffer?.id ?? null,
          pickup_district:  cleanFrom,
          pickup_location:  pickupLocation || (serviceMode === 'shop_pickup' && shopName ? shopName : cleanFrom),
          dropoff_district: cleanTo,
          dropoff_location: dropoffLocation || cleanTo,
          cargo_kg:         parseFloat(cargoKg),
          cargo_type:       consolidatedCargo || null,
          pickup_date:      pickupDate,
          notes:            compiledNotes || null,
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
        <h2 style={{ fontWeight: 900, fontSize: 22, color: C.text, margin: '0 0 8px' }}>
          {serviceMode === 'shop_pickup' ? 'Store Pickup Request Live!' : 'Delivery Request Posted!'}
        </h2>
        {hasDrivers ? (
          <p style={{ fontSize: 14, color: 'var(--color-success)', fontWeight: 600, maxWidth: 460, margin: '0 auto 12px' }}>
            {driversNotified} captain{driversNotified === 1 ? '' : 's'} operating near {pickupDistrict} have been alerted and can accept your request.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-harvest)', fontWeight: 600, margin: '0 0 6px' }}>
              Your request is live for all transporters and captains across Uganda.
            </p>
            <p style={{ fontSize: 13, color: C.muted, maxWidth: 440, margin: '0 auto 12px' }}>
              Captains operating along the route between {pickupDistrict} and {dropoffDistrict} are being matched.
            </p>
          </>
        )}
        <p style={{ fontSize: 12, color: C.muted }}>Redirecting to your deliveries dashboard…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hidden Datalist for District Autocomplete */}
      <datalist id="uganda-districts-datalist">
        {DISTRICTS.map(d => (
          <option key={`dl-${d}`} value={d} />
        ))}
      </datalist>

      {/* ─────────────────────────────────────────────────────────────
          1. SERVICE MODE SELECTOR (Delivery vs Shop Pickup vs Combined)
         ───────────────────────────────────────────────────────────── */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 800, color: C.text, display: 'block', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Select Logistics Service Type *
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {SERVICE_MODES.map(item => {
            const isSelected = serviceMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => setServiceMode(item.mode)}
                style={{
                  padding: '14px 12px',
                  borderRadius: 14,
                  border: `2px solid ${isSelected ? 'var(--color-primary)' : C.border}`,
                  background: isSelected ? 'var(--color-primary-bg)' : 'var(--d-card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(22, 107, 58, 0.12)' : 'none',
                }}
              >
                {item.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: item.mode === 'combined' ? 'var(--color-harvest)' : 'var(--color-primary)',
                      color: '#FFFFFF',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: isSelected ? 'var(--color-primary)' : C.muted }}>
                  {item.icon}
                  <span style={{ fontSize: 13, fontWeight: 800, color: isSelected ? 'var(--color-primary)' : C.text }}>
                    {item.title}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.35 }}>
                  {item.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Service Route Flow Indicator */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: 'var(--color-surface-2, #F3F4F6)',
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 700,
          color: C.text,
        }}
      >
        {serviceMode === 'delivery' && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>📍 Farm Pickup ({pickupDistrict})</span>
            <ArrowRight size={14} style={{ color: C.green }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>🏁 Buyer Dropoff ({dropoffDistrict || 'Target'})</span>
          </>
        )}
        {serviceMode === 'shop_pickup' && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>🏬 Agro-Shop ({pickupDistrict})</span>
            <ArrowRight size={14} style={{ color: C.green }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>🏡 Your Farm ({dropoffDistrict || 'Destination'})</span>
          </>
        )}
        {serviceMode === 'combined' && (
          <>
            <span>🏡 Farm Produce</span>
            <ArrowRight size={12} style={{ color: C.green }} />
            <span>Market Delivery</span>
            <ArrowRight size={12} style={{ color: C.green }} />
            <span>🏬 Shop Input Pickup</span>
            <ArrowRight size={12} style={{ color: C.green }} />
            <span>🏡 Farm Return</span>
          </>
        )}
      </div>

      {/* Store Input Pickup Fields (When Shop Pickup or Combined is active) */}
      {(serviceMode === 'shop_pickup' || serviceMode === 'combined') && (
        <div
          style={{
            padding: '16px',
            borderRadius: 14,
            background: 'var(--color-primary-bg)',
            border: '1.5px solid var(--color-primary-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)' }}>
            <Store size={18} />
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Agro-Dealer & Input Details</h3>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'block', marginBottom: 4 }}>
              Agro-Input Dealer / Shop Name & Location *
            </label>
            <input
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="e.g. Victoria Seeds / Bukoola Chemicals, Container Village Kampala"
              required={serviceMode === 'shop_pickup'}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 13,
                background: '#FFFFFF', color: C.text, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'block', marginBottom: 6 }}>
              Select Inputs to Pick Up (Quick selection)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMON_INPUTS.map(chip => {
                const isSelected = selectedInputs.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleInputChip(chip)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 999,
                      border: `1px solid ${isSelected ? 'var(--color-primary)' : C.border}`,
                      background: isSelected ? 'var(--color-primary)' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : C.text,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{chip}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'block', marginBottom: 4 }}>
              Additional Items or Receipt / Order Number
            </label>
            <input
              type="text"
              value={customInputNotes}
              onChange={e => setCustomInputNotes(e.target.value)}
              placeholder="e.g. 2 bags of DAP, Order #VS-892 under name John Okello"
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 12.5,
                background: '#FFFFFF', color: C.text, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Origin & Destination Districts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {/* Pickup District */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 6 }}>
            {serviceMode === 'shop_pickup' ? 'Shop / Collection District *' : 'Pickup District (Where to collect) *'}
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

          {/* Quick Popular District Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {POPULAR_DISTRICTS.slice(0, 5).map(dist => (
              <button
                key={`p-${dist}`}
                type="button"
                onClick={() => setPickupDistrict(dist)}
                style={{
                  padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
                  fontSize: 11, background: pickupDistrict === dist ? 'var(--color-primary-bg)' : 'transparent',
                  color: pickupDistrict === dist ? 'var(--color-primary)' : C.muted, cursor: 'pointer', fontWeight: 600,
                }}
              >
                {dist}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={pickupLocation}
            onChange={e => setPickupLocation(e.target.value)}
            placeholder="Specific pickup address / village / shop branch (optional)"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13, marginTop: 8,
              background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Dropoff District */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 6 }}>
            {serviceMode === 'shop_pickup' ? 'Your Farm / Delivery District *' : 'Drop-off District (Destination) *'}
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

          {/* Quick Dropoff District Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {POPULAR_DISTRICTS.map(dist => (
              <button
                key={`d-${dist}`}
                type="button"
                onClick={() => setDropoffDistrict(dist)}
                style={{
                  padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
                  fontSize: 11, background: dropoffDistrict === dist ? 'var(--color-primary-bg)' : 'transparent',
                  color: dropoffDistrict === dist ? 'var(--color-primary)' : C.muted, cursor: 'pointer', fontWeight: 600,
                }}
              >
                {dist}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={dropoffLocation}
            onChange={e => setDropoffLocation(e.target.value)}
            placeholder="Specific warehouse / landmark / contact person (optional)"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13, marginTop: 8,
              background: 'var(--d-input-bg, #fff)', color: C.text, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Delivery Speed & Type */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 8 }}>
          Delivery Speed & Logistics Tier *
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
      </div>

      {/* Cargo Specifications */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Cargo / Package Weight (kg) *
          </label>
          <input
            type="number"
            value={cargoKg}
            onChange={e => setCargoKg(e.target.value)}
            placeholder="e.g. 100"
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
            Cargo Description / Crop
          </label>
          <input
            type="text"
            value={cargoType}
            onChange={e => setCargoType(e.target.value)}
            placeholder="e.g. Maize, Coffee, Tomato, Fertilizer"
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
              boxSizing: 'border-box', background: 'var(--d-input-bg, #fff)', color: C.text,
            }}
          />
        </div>
      </div>

      {/* Recommended Transport Vehicle Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'var(--color-surface-2, #f3f4f6)',
          fontSize: 12.5,
          fontWeight: 700,
          color: C.text,
        }}
      >
        <span style={{ fontSize: 20 }}>{recommendedVehicle.icon}</span>
        <div>
          <div>Matched Fleet: <b>{recommendedVehicle.name}</b></div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{recommendedVehicle.badge}</div>
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
            Special Instructions <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Call upon arrival, fragile produce..."
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
              boxSizing: 'border-box', background: 'var(--d-input-bg, #fff)', color: C.text,
            }}
          />
        </div>
      </div>

      {/* Live Route & Escrow Protected Fare Card */}
      {fare && (
        <div style={{
          padding: '18px 20px', borderRadius: 16,
          background: 'var(--color-primary-bg)',
          border: '1.5px solid var(--color-primary-muted, rgba(34,197,94,0.3))',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 900, background: 'var(--color-primary)', color: '#fff', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={10} /> ESCROW PROTECTED
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>100% Refundable</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '4px 0 0' }}>Trip Fare Breakdown</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                {pickupDistrict} → {dropoffDistrict} {serviceMode === 'combined' ? '(Round Trip)' : ''}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 24, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
                UGX {fare.totalFare.toLocaleString()}
              </p>
              <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>held safely in escrow</p>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: C.muted }}>Driver Guaranteed Earnings</span>
              <span style={{ fontWeight: 700, color: C.text }}>UGX {fare.driverEarnings.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: C.muted }}>Goods In-Transit & Platform Cover</span>
              <span style={{ fontWeight: 700, color: C.green }}>UGX {fare.commissionAmount.toLocaleString()}</span>
            </div>
            <div style={{ height: 1, background: 'var(--d-border)', marginBottom: 6 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11.5, color: C.muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> Distance: ~{fare.distanceKm} km
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Est. Arrival: {fare.etaLabel}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <ShieldCheck size={16} style={{ color: C.green, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11.5, color: C.text, margin: 0, lineHeight: 1.45 }}>
              <strong>Escrow Protection:</strong> Funds are locked safely and released to the driver <em>only</em> after cargo is verified delivered at your dropoff. If no driver accepts or the trip cancels, your funds are instantly refunded.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
          <AlertTriangle size={15} /> {error}
        </p>
      )}

      {/* Direct Submit Action with Escrow */}
      <button
        type="submit"
        disabled={loading || !fare}
        style={{
          padding: '16px',
          background: (loading || !fare) ? 'var(--color-surface-2, #ccc)' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          color: (loading || !fare) ? C.muted : '#fff',
          border: 'none',
          borderRadius: 14,
          fontWeight: 900,
          fontSize: 15,
          cursor: (loading || !fare) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: (loading || !fare) ? 'none' : '0 6px 20px rgba(22, 163, 74, 0.35)',
          transition: 'all 0.15s ease',
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Locking Escrow & Alerting Nearby Captains…
          </>
        ) : fare ? (
          <>
            <Lock size={16} />
            <span>Request {serviceMode === 'shop_pickup' ? 'Pickup' : 'Delivery'} — Secure UGX {fare.totalFare.toLocaleString()} with Escrow</span>
            <ArrowRight size={16} />
          </>
        ) : (
          'Enter Drop-off & Cargo to Calculate Escrow Fare'
        )}
      </button>
    </form>
  );
}
