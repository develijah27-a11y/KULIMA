import { UGANDA_DISTRICTS } from './districts';

export type DeliveryType = 'cold' | 'fast' | 'standard';

export const COMMISSION_RATE = 10; // 10% app commission on every delivery

interface PricingConfig {
  baseFare: number;    // UGX flat base
  perKm: number;       // UGX per road-km
  per100Kg: number;    // UGX per 100 kg of cargo
  multiplier: number;  // overall type multiplier
  minFare: number;     // floor price in UGX
  etaLabel: string;
  description: string;
}

const PRICING: Record<DeliveryType, PricingConfig> = {
  standard: {
    baseFare:    15_000,
    perKm:          500,
    per100Kg:     2_000,
    multiplier:     1.0,
    minFare:     20_000,
    etaLabel:   '2–5 days',
    description: 'Standard transport. Best price for non-urgent goods.',
  },
  fast: {
    baseFare:    25_000,
    perKm:          800,
    per100Kg:     3_000,
    multiplier:     1.5,
    minFare:     40_000,
    etaLabel:   'Same day – 24 hrs',
    description: 'Priority dispatch. Goods delivered within hours to next day.',
  },
  cold: {
    baseFare:    40_000,
    perKm:        1_200,
    per100Kg:     5_000,
    multiplier:     2.0,
    minFare:     65_000,
    etaLabel:   '1–3 days',
    description: 'Refrigerated vehicle. Required for perishables, dairy, and fresh produce.',
  },
};

/** Straight-line distance via Haversine formula (km) */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Road distance estimate between two Uganda districts (km) */
export function calcDistanceKm(fromDistrict: string, toDistrict: string): number {
  const from = UGANDA_DISTRICTS[fromDistrict];
  const to   = UGANDA_DISTRICTS[toDistrict];
  if (!from || !to) return 120; // fallback average for unknown districts
  if (fromDistrict === toDistrict) return 15;  // intra-district average
  const straight = haversineKm(from.lat, from.lng, to.lat, to.lng);
  // Uganda road factor ≈ 1.4 — roads are not straight lines
  return Math.max(Math.round(straight * 1.4 * 10) / 10, 5);
}

export interface FareBreakdown {
  type: DeliveryType;
  distanceKm: number;
  baseFare: number;
  distanceFare: number;
  weightFare: number;
  subtotal: number;
  totalFare: number;         // rounded to nearest 1,000 UGX
  commissionAmount: number;  // app's 10%
  driverEarnings: number;    // what the driver receives
  etaLabel: string;
  description: string;
}

export function calcFare(
  fromDistrict: string,
  toDistrict: string,
  cargoKg: number,
  type: DeliveryType,
): FareBreakdown {
  const cfg          = PRICING[type];
  const distanceKm   = calcDistanceKm(fromDistrict, toDistrict);
  const baseFare     = cfg.baseFare;
  const distanceFare = Math.round(distanceKm * cfg.perKm);
  const weightFare   = Math.floor(cargoKg / 100) * cfg.per100Kg;
  const subtotal     = baseFare + distanceFare + weightFare;
  const raw          = subtotal * cfg.multiplier;
  // Round to nearest 1,000 UGX and enforce minimum
  const totalFare    = Math.max(Math.round(raw / 1000) * 1000, cfg.minFare);
  const commissionAmount = Math.round(totalFare * (COMMISSION_RATE / 100));
  const driverEarnings   = totalFare - commissionAmount;

  return {
    type,
    distanceKm,
    baseFare,
    distanceFare,
    weightFare,
    subtotal,
    totalFare,
    commissionAmount,
    driverEarnings,
    etaLabel: cfg.etaLabel,
    description: cfg.description,
  };
}

export function formatUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString()}`;
}

export const DELIVERY_TYPE_META: Record<DeliveryType, {
  icon: string; label: string; color: string; bg: string; border: string;
}> = {
  standard: {
    icon: '🚛', label: 'Standard',
    color: 'var(--color-primary)',  bg: 'var(--color-primary-bg)',  border: 'var(--color-primary)',
  },
  fast: {
    icon: '⚡', label: 'Fast Delivery',
    color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)',  border: 'var(--color-harvest)',
  },
  cold: {
    icon: '❄️', label: 'Cold Chain',
    color: '#0EA5E9', bg: '#E0F2FE', border: '#0EA5E9',
  },
};
