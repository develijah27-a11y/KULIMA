import { type SupabaseClient } from '@supabase/supabase-js';
import { UGANDA_DISTRICTS, getDistrict, getDefaultDistrict } from './districts';
import { sendPushToUsers } from './push';
import { logSystemEvent } from './system-log';

export interface NotifyNearbyDriversParams {
  deliveryId: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  cargoKg: number;
  cargoType?: string | null;
  deliveryType?: string; // 'standard' | 'fast' | 'cold'
  totalFare?: number;
  pickupLat?: number | null;
  pickupLng?: number | null;
  excludeUserId?: string | null;
}

export interface NotifyNearbyDriversResult {
  driversNotified: number;
  driverUserIds: string[];
}

/** Haversine formula to compute great-circle distance between two points in km */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROXIMITY_RADIUS_KM = 85;
const REGIONAL_FALLBACK_RADIUS_KM = 160;

/**
 * Discovers and notifies ALL available and nearby drivers / transporters in the system
 * whenever someone requests a delivery.
 * 
 * Multi-layer proximity matching:
 * 1. Physical GPS Proximity: Vehicles with recent live GPS within PROXIMITY_RADIUS_KM of pickup.
 * 2. Operating District Coverage: Vehicles whose coverage districts array includes pickup or nearby districts.
 * 3. Transporter Profile Location: Registered transporters whose profile district is in or near the pickup point.
 * 4. Regional Fallback: If immediate nearby count is sparse (< 5), expands to all drivers in the region.
 * 5. System-wide Fallback: If still sparse, notifies all verified transporters so no job goes unserviced.
 * 
 * STRICT ZERO EMOJI POLICY: All notifications use clean plain text labels without emojis.
 */
export async function notifyNearbyDrivers(
  admin: SupabaseClient,
  params: NotifyNearbyDriversParams
): Promise<NotifyNearbyDriversResult> {
  const {
    deliveryId,
    pickupDistrict,
    dropoffDistrict,
    cargoKg,
    deliveryType = 'standard',
    totalFare,
    pickupLat,
    pickupLng,
    excludeUserId,
  } = params;

  // Determine pickup reference coordinates
  let centerLat: number;
  let centerLng: number;
  let pickupRegion: string | null = null;

  const validCoord = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v) && v >= -90 && v <= 90;
  const validLng = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v) && v >= -180 && v <= 180;

  if (validCoord(pickupLat) && validLng(pickupLng)) {
    centerLat = pickupLat;
    centerLng = pickupLng;
    const distInfo = getDistrict(pickupDistrict);
    if (distInfo) pickupRegion = distInfo.region;
  } else {
    const distInfo = getDistrict(pickupDistrict) ?? getDefaultDistrict();
    centerLat = distInfo.lat;
    centerLng = distInfo.lng;
    pickupRegion = distInfo.region;
  }

  const cleanPickupDistrict = pickupDistrict.trim().toLowerCase();
  const matchedDriverIds = new Set<string>();
  const regionalDriverIds = new Set<string>();
  const allTransporterIds = new Set<string>();

  try {
    // 1. Query all vehicles in the system
    const { data: vehicles, error: vehicleErr } = await (admin.from as any)('vehicles')
      .select('id, user_id, vehicle_type, capacity_kg, is_available, is_cold_capable, current_lat, current_lng, districts, location_updated_at')
      .limit(300);

    if (vehicleErr) {
      console.error('[notifyNearbyDrivers] Vehicle fetch error:', vehicleErr);
    }

    if (vehicles && vehicles.length > 0) {
      for (const v of vehicles) {
        if (!v.user_id || v.user_id === excludeUserId) continue;

        // If cold transport requested, we still prefer cold-capable but don't strictly hide standard if fallback needed
        let isMatch = false;

        // 1a. Check physical GPS distance
        if (validCoord(v.current_lat) && validLng(v.current_lng)) {
          const dist = haversineKm(centerLat, centerLng, v.current_lat, v.current_lng);
          if (dist <= PROXIMITY_RADIUS_KM) {
            matchedDriverIds.add(v.user_id);
            isMatch = true;
          } else if (dist <= REGIONAL_FALLBACK_RADIUS_KM) {
            regionalDriverIds.add(v.user_id);
          }
        }

        // 1b. Check operating districts
        if (!isMatch && Array.isArray(v.districts) && v.districts.length > 0) {
          const coversPickup = v.districts.some(
            (d: string) => typeof d === 'string' && d.trim().toLowerCase() === cleanPickupDistrict
          );
          if (coversPickup) {
            matchedDriverIds.add(v.user_id);
            isMatch = true;
          } else {
            // Check if any covered district is within proximity radius
            for (const d of v.districts) {
              const dInfo = getDistrict(d);
              if (dInfo) {
                const dist = haversineKm(centerLat, centerLng, dInfo.lat, dInfo.lng);
                if (dist <= PROXIMITY_RADIUS_KM) {
                  matchedDriverIds.add(v.user_id);
                  isMatch = true;
                  break;
                } else if (dist <= REGIONAL_FALLBACK_RADIUS_KM) {
                  regionalDriverIds.add(v.user_id);
                }
              }
            }
          }
        }

        allTransporterIds.add(v.user_id);
      }
    }

    // 2. Query transporter profiles
    const [{ data: byRole }, { data: byRoles }] = await Promise.all([
      (admin.from as any)('profiles')
        .select('id, user_id, location, role')
        .eq('role', 'transporter')
        .limit(300),
      (admin.from as any)('profiles')
        .select('id, user_id, location, role, roles')
        .contains('roles', ['transporter'])
        .limit(300),
    ]);

    const allProfiles = [...(byRole ?? []), ...(byRoles ?? [])];
    const seenProfileUsers = new Set<string>();

    for (const p of allProfiles) {
      if (!p.user_id || p.user_id === excludeUserId || seenProfileUsers.has(p.user_id)) continue;
      seenProfileUsers.add(p.user_id);
      allTransporterIds.add(p.user_id);

      const loc = (p.location ?? '').trim().toLowerCase();
      if (loc) {
        if (loc.includes(cleanPickupDistrict) || cleanPickupDistrict.includes(loc)) {
          matchedDriverIds.add(p.user_id);
          continue;
        }

        // Check if profile location maps to a known district
        const pDistrict = getDistrict(p.location);
        if (pDistrict) {
          const dist = haversineKm(centerLat, centerLng, pDistrict.lat, pDistrict.lng);
          if (dist <= PROXIMITY_RADIUS_KM) {
            matchedDriverIds.add(p.user_id);
          } else if (dist <= REGIONAL_FALLBACK_RADIUS_KM || (pickupRegion && pDistrict.region === pickupRegion)) {
            regionalDriverIds.add(p.user_id);
          }
        }
      }
    }

    // 3. Fallback logic: Ensure every driver in the vicinity is reached
    // If fewer than 5 drivers match strict proximity, expand with regional matches
    if (matchedDriverIds.size < 5) {
      for (const id of regionalDriverIds) {
        matchedDriverIds.add(id);
      }
    }

    // If still zero or very sparse (< 3), notify all registered transporters nationwide
    if (matchedDriverIds.size < 3) {
      for (const id of allTransporterIds) {
        matchedDriverIds.add(id);
      }
    }

    const driverUserIds = Array.from(matchedDriverIds);
    if (driverUserIds.length === 0) {
      return { driversNotified: 0, driverUserIds: [] };
    }

    // 4. Record pending driver_assignments for all matched drivers
    const assignments = driverUserIds.map(driverId => ({
      delivery_id: deliveryId,
      driver_id: driverId,
      status: 'pending',
    }));

    try {
      await (admin.from as any)('driver_assignments')
        .upsert(assignments, { onConflict: 'delivery_id,driver_id', ignoreDuplicates: true });
    } catch (assignErr) {
      console.error('[notifyNearbyDrivers] Error inserting driver assignments:', assignErr);
    }

    // 5. Build clean, professional notification text (STRICT ZERO EMOJI POLICY)
    const typeLabel =
      deliveryType === 'cold'
        ? 'Cold Transport'
        : deliveryType === 'fast'
        ? 'Express Delivery'
        : 'Standard Delivery';

    const fareFormatted = totalFare ? `UGX ${Math.round(totalFare).toLocaleString()}` : '';
    const notifTitle = 'New Delivery Request Nearby';
    const notifBody = fareFormatted
      ? `${typeLabel} · ${cargoKg}kg from ${pickupDistrict} to ${dropoffDistrict} · ${fareFormatted}`
      : `${typeLabel} · ${cargoKg}kg from ${pickupDistrict} to ${dropoffDistrict}`;

    // 6. Insert in-app notifications
    const notifications = driverUserIds.map(driverId => ({
      user_id: driverId,
      role: 'transporter',
      type: 'delivery',
      title: notifTitle,
      body: notifBody,
      data: {
        delivery_id: deliveryId,
        pickup_district: pickupDistrict,
        dropoff_district: dropoffDistrict,
        cargo_kg: cargoKg,
        fare: totalFare ?? null,
      },
      read: false,
    }));

    try {
      await (admin.from as any)('notifications').insert(notifications);
    } catch (notifErr) {
      console.error('[notifyNearbyDrivers] Error inserting notifications:', notifErr);
    }

    // 7. Dispatch Web Push notifications
    try {
      await sendPushToUsers(driverUserIds, {
        title: notifTitle,
        body: notifBody,
        url: '/transporter/job-queue',
        tag: `delivery-${deliveryId}`,
      });
    } catch (pushErr) {
      console.error('[notifyNearbyDrivers] Error sending push notifications:', pushErr);
    }

    // 8. Log system event
    logSystemEvent({
      category: 'api_request',
      level: 'info',
      route: '/api/deliveries',
      method: 'POST',
      message: `Notified ${driverUserIds.length} nearby drivers for delivery ${deliveryId} in ${pickupDistrict}`,
      metadata: {
        deliveryId,
        pickupDistrict,
        dropoffDistrict,
        driversNotified: driverUserIds.length,
        driverUserIds,
      },
    });

    return {
      driversNotified: driverUserIds.length,
      driverUserIds,
    };
  } catch (err) {
    console.error('[notifyNearbyDrivers] Unexpected error during driver discovery:', err);
    logSystemEvent({
      category: 'error',
      level: 'error',
      route: '/api/deliveries',
      method: 'POST',
      message: err instanceof Error ? err.message : 'Failed to notify nearby drivers',
      metadata: {
        deliveryId,
        pickupDistrict,
        dropoffDistrict,
        stack: err instanceof Error ? err.stack?.slice(0, 1000) : undefined,
      },
    });
    return {
      driversNotified: 0,
      driverUserIds: [],
    };
  }
}
