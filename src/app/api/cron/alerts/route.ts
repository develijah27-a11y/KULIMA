import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUsers } from '@/lib/push';

// Vercel cron — every 6 hours
export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

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

  // 4. Low stock — supplier products. Same 5-unit threshold already shown
  // as a "Low stock" badge in the supplier's own catalogue view.
  const { data: lowProducts } = await (supabase.from as any)('supplier_products')
    .select('id, supplier_id, name, stock_qty, unit, is_available, profile:profiles!supplier_products_supplier_id_fkey(user_id)')
    .eq('is_available', true)
    .lt('stock_qty', 5);

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

  return NextResponse.json({
    success: true,
    priceChanges: priceChanges.length,
    lowInventory: (lowInventory ?? []).length,
    lowProducts: (lowProducts ?? []).length,
  });
}
