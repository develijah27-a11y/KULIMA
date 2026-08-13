import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushToUsers } from '@/lib/push';
import { generatePlantingAlerts, applyWeatherToPlantingAlerts } from '@/lib/planting-calendar';
import { fetchWeatherForDistrict, type ServerWeatherData } from '@/lib/weather-server';

// Vercel cron — every 6 hours
export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Service-role client — a Vercel Cron request has no Supabase session, so
  // the owner-scoped farm_inventory read below (and any RLS-gated table)
  // would otherwise silently return zero rows.
  const supabase = createServiceRoleClient();

  // 0. Reset expired flash deals. is_flash_deal otherwise stays true forever
  // once flash_ends_at passes (nothing else clears it) — the product just
  // silently vanishes from the "Active Deals" list AND stays excluded from
  // "Ready to Flash" candidates, so a supplier has no way back in short of
  // finding and manually ending a deal they can no longer even see as
  // active. Same field reset as the manual "End early" action
  // (DELETE /api/supplier-products/[id]/flash).
  const { data: expiredFlashDeals } = await (supabase.from as any)('supplier_products')
    .update({ is_flash_deal: false, flash_price_ugx: null, flash_starts_at: null, flash_ends_at: null })
    .eq('is_flash_deal', true)
    .lte('flash_ends_at', new Date().toISOString())
    .select('id');

  // 1. Fetch latest weather to detect rain forecast
  const { data: cache } = await supabase.from('weather_cache').select('*').limit(10);
  (cache ?? []).forEach((w: any) => {
    const forecast = w.data?.forecast ?? [];
    const rainDays = (forecast as any[]).filter((d: any) => (d.pop ?? 0) > 0.6);
    if (rainDays.length > 0 && w.location_key) {
      // Notify all farmers in this district
      supabase.from('profiles')
        .select('user_id')
        .eq('district', w.location_key)
        .eq('role', 'farmer')
        .then(({ data: farmers }) => {
          if (!farmers?.length) return;
          const body = rainDays[0]?.weather?.[0]?.description ?? 'Heavy rain expected in the next few days';
          (supabase.from as any)('notifications').insert(
            farmers.map((f: any) => ({
              user_id: f.user_id,
              role:    'farmer',
              type:    'rain',
              title:   'Rain arriving in your area',
              body,
              read:    false,
            }))
          );
          sendPushToUsers(farmers.map((f: any) => f.user_id), { title: 'Rain arriving in your area', body, url: '/farmer/weather' });
        });
    }
  });

  // 2. Detect price changes >= 5% and notify farmers growing that crop.
  // Compares the latest recorded price for each crop against the most
  // recent *prior* price (any earlier recorded_at, any source) — not a
  // fixed sample-count split, which needed 10+ rows per crop in a 2-day
  // window to ever fire and in practice never did.
  const { data: recentPrices } = await (supabase.from as any)('market_prices')
    .select('crop_type, price_per_kg, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(500);

  const byCrop: Record<string, { price_per_kg: number; recorded_at: string }[]> = {};
  (recentPrices ?? []).forEach((p: any) => { (byCrop[p.crop_type] ??= []).push(p); });

  const priceChanges: { crop: string; oldPrice: number; newPrice: number; pct: number }[] = [];
  for (const [crop, rows] of Object.entries(byCrop)) {
    if (rows.length < 2) continue;
    const [latest, prior] = rows; // already sorted desc by recorded_at
    if (!prior.price_per_kg) continue;
    const pct = (latest.price_per_kg - prior.price_per_kg) / prior.price_per_kg;
    if (Math.abs(pct) >= 0.05) {
      priceChanges.push({ crop, oldPrice: prior.price_per_kg, newPrice: latest.price_per_kg, pct });
    }
  }

  for (const change of priceChanges) {
    const { data: farmers } = await (supabase.from as any)('profiles')
      .select('user_id')
      .eq('primary_crop', change.crop)
      .eq('role', 'farmer');
    if (!farmers?.length) continue;

    const title = `${change.crop} price ${change.pct > 0 ? 'up' : 'down'} ${Math.abs(Math.round(change.pct * 100))}%`;

    // Don't re-notify the same farmer about the same crop more than once a day.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: alreadyNotified } = await (supabase.from as any)('notifications')
      .select('user_id')
      .eq('title', title)
      .gte('created_at', dayAgo)
      .in('user_id', farmers.map((f: any) => f.user_id));
    const notifiedIds = new Set((alreadyNotified ?? []).map((n: any) => n.user_id));

    const toNotify = farmers.filter((f: any) => !notifiedIds.has(f.user_id));
    if (toNotify.length === 0) continue;

    const body = `${change.crop} moved from UGX ${Math.round(change.oldPrice).toLocaleString()} to UGX ${Math.round(change.newPrice).toLocaleString()} per kg. Check the market page before you sell.`;
    await (supabase.from as any)('notifications').insert(
      toNotify.map((f: any) => ({
        user_id: f.user_id,
        role: 'farmer',
        type: 'price',
        title,
        body,
        read: false,
      })),
    );
    await sendPushToUsers(toNotify.map((f: any) => f.user_id), { title, body, url: '/farmer/prices' });
  }

  // 3. Low stock — farmer inputs. farm_inventory.low_stock_threshold is set
  // per item by the farmer; quantity at or below it means they're close to
  // running out of something they use on the farm (seed, fertilizer, etc.).
  // PostgREST filters compare a column to a literal, not to another column,
  // so "quantity <= low_stock_threshold" is done in JS after a narrower fetch.
  const { data: inventoryWithThreshold } = await (supabase.from as any)('farm_inventory')
    .select('id, farmer_id, name, quantity, unit, low_stock_threshold, profile:profiles!farm_inventory_farmer_id_fkey(user_id)')
    .not('low_stock_threshold', 'is', null)
    .gt('low_stock_threshold', 0);
  const lowInventory = (inventoryWithThreshold ?? []).filter((i: any) => i.quantity <= i.low_stock_threshold);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (const item of (lowInventory ?? []) as any[]) {
    const userId = item.profile?.user_id;
    if (!userId) continue;
    const title = `Running low: ${item.name}`;

    const { data: already } = await (supabase.from as any)('notifications')
      .select('id').eq('user_id', userId).eq('title', title).gte('created_at', dayAgo).maybeSingle();
    if (already) continue;

    const body = `You have ${item.quantity} ${item.unit} of ${item.name} left — below your restock threshold of ${item.low_stock_threshold} ${item.unit}.`;
    await (supabase.from as any)('notifications').insert({ user_id: userId, role: 'farmer', type: 'stock', title, body, read: false });
    await sendPushToUsers([userId], { title, body, url: '/farmer/inventory' });
  }

  // 4. Low stock — supplier products. Each product can set its own
  // low_stock_threshold (a bag of seed and a piece of equipment don't run
  // low at the same quantity) — falls back to 5 units when unset, matching
  // the "Low stock" badge shown in the supplier's own catalogue view.
  const { data: availableProducts } = await (supabase.from as any)('supplier_products')
    .select('id, supplier_id, name, stock_qty, unit, low_stock_threshold, is_available, profile:profiles!supplier_products_supplier_id_fkey(user_id)')
    .eq('is_available', true);
  const lowProducts = (availableProducts ?? []).filter((p: any) => p.stock_qty <= (p.low_stock_threshold ?? 5));

  for (const p of (lowProducts ?? []) as any[]) {
    const userId = p.profile?.user_id;
    if (!userId) continue;
    const title = `Running low: ${p.name}`;

    const { data: already } = await (supabase.from as any)('notifications')
      .select('id').eq('user_id', userId).eq('title', title).gte('created_at', dayAgo).maybeSingle();
    if (already) continue;

    const body = `Only ${p.stock_qty} ${p.unit} of ${p.name} left in stock. Restock soon or farmers won't be able to order it.`;
    await (supabase.from as any)('notifications').insert({ user_id: userId, role: 'supplier', type: 'stock', title, body, read: false });
    await sendPushToUsers([userId], { title, body, url: '/supplier/catalogue' });
  }

  // 5. Planting-season alerts. lib/planting-calendar.ts computes real
  // plant/weed/harvest windows per crop, but until now it was only ever
  // rendered passively on /farmer/weather and /farmer/planting — nothing
  // pushed it to a farmer who doesn't happen to open those pages the day
  // a window opens. Only farmers with a primary_crop set get these (an
  // unset crop means generatePlantingAlerts would return every tracked
  // crop, which would be noisy spam rather than a useful nudge).
  const { data: cropFarmers } = await (supabase.from as any)('profiles')
    .select('user_id, primary_crop, location')
    .eq('role', 'farmer')
    .not('primary_crop', 'is', null);

  const now = new Date();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let plantingAlertsSent = 0;

  // Cache forecasts per district for the duration of this single cron run —
  // avoids one Open-Meteo await per farmer when many farmers share a district
  // (weather-server also caches for 30 min at the fetch level, this is just
  // avoiding redundant awaits within one invocation).
  const weatherByDistrict = new Map<string, ServerWeatherData>();

  for (const farmer of (cropFarmers ?? []) as any[]) {
    let alerts = generatePlantingAlerts(now.getMonth(), now.getDate(), [farmer.primary_crop]);

    // Cross-check plant_now/plant_soon alerts against the real forecast so
    // the calendar's climatological guess doesn't contradict what the rain
    // is actually doing this year.
    const districtName = farmer.location as string | undefined;
    if (districtName) {
      let weather = weatherByDistrict.get(districtName);
      if (!weather) {
        weather = await fetchWeatherForDistrict(districtName);
        weatherByDistrict.set(districtName, weather);
      }
      alerts = applyWeatherToPlantingAlerts(alerts, weather.daily);
    }

    // Only the actionable, time-sensitive ones — not the low-urgency
    // "21 days out" heads-up, which would otherwise refire every 6 hours.
    const actionable = alerts.filter((a) =>
      a.type === 'plant_now' || a.type === 'weed_now' || a.type === 'harvest_now' || a.type === 'plant_soon'
    );

    for (const alert of actionable) {
      const { data: already } = await (supabase.from as any)('notifications')
        .select('id').eq('user_id', farmer.user_id).eq('title', alert.title).gte('created_at', twoWeeksAgo).maybeSingle();
      if (already) continue;

      await (supabase.from as any)('notifications').insert({
        user_id: farmer.user_id, role: 'farmer', type: 'planting', title: alert.title, body: alert.message, read: false,
      });
      await sendPushToUsers([farmer.user_id], { title: alert.title, body: alert.message, url: '/farmer/planting' });
      plantingAlertsSent++;
    }
  }

  return NextResponse.json({
    success: true,
    expiredFlashDeals: (expiredFlashDeals ?? []).length,
    priceChanges: priceChanges.length,
    lowInventory: (lowInventory ?? []).length,
    lowProducts: (lowProducts ?? []).length,
    plantingAlertsSent,
  });
}
