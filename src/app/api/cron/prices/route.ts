import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Vercel cron — runs daily at 07:00 EAT (04:00 UTC)
// Fetches real global commodity prices and stores them in market_prices
// so farmers see the same reference prices shown on Google/international markets.
//
// Price sources (tried in order):
//   1. Alpha Vantage   — set ALPHAVANTAGE_API_KEY in Vercel env vars (free tier OK)
//   2. World Bank API  — free, no key, monthly data (used as fallback)
//
// Exchange rate:
//   open.er-api.com — free, no key, daily USD/UGX rate

// ── Types ────────────────────────────────────────────────────────────────

interface CommoditySpec {
  fn: string;          // Alpha Vantage function name
  crop: string;        // crop_type for market_prices table
  market: string;      // market_name for market_prices table
  // Converts the raw number from the API to kg, then we multiply by USD rate
  toKg: (raw: number) => number;
  // World Bank indicator code (fallback)
  wbIndicator?: string;
}

// ── Commodity definitions ─────────────────────────────────────────────────

const COMMODITIES: CommoditySpec[] = [
  {
    fn: 'CORN',
    crop: 'maize',
    market: 'World Market (CBOT)',
    toKg: (cents) => (cents / 100) / 25.4012,   // cents/bushel → USD/kg
    wbIndicator: 'PMAIZMMT_USD',
  },
  {
    fn: 'COFFEE',
    crop: 'coffee',
    market: 'World Market (ICE)',
    toKg: (cents) => (cents / 100) / 0.453592,  // cents/lb → USD/kg
    wbIndicator: 'PCOFFOTM_USD',
  },
  {
    fn: 'COTTON',
    crop: 'cotton',
    market: 'World Market (ICE)',
    toKg: (cents) => (cents / 100) / 0.453592,
    wbIndicator: 'PCOTTINDUM_USD',
  },
  {
    fn: 'SUGAR',
    crop: 'sugar',
    market: 'World Market (ICE)',
    toKg: (cents) => (cents / 100) / 0.453592,
    wbIndicator: 'PSUGAISAUSDM',
  },
  {
    fn: 'WHEAT',
    crop: 'wheat',
    market: 'World Market (CBOT)',
    toKg: (cents) => (cents / 100) / 27.2155,   // cents/bushel → USD/kg
    wbIndicator: 'PWHEAMTUSDM',
  },
  {
    fn: 'RICE',
    crop: 'rice',
    market: 'World Market (CBOT)',
    toKg: (cents) => (cents / 100) / 45.3592,   // cents/cwt (100lb) → USD/kg
    wbIndicator: 'PRICENPQUSDM',
  },
];

// ── Exchange rate (free, no key) ──────────────────────────────────────────

async function getUsdToUgx(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('rate fetch failed');
    const json = await res.json();
    const rate = typeof json.rates?.UGX === 'number' ? json.rates.UGX : null;
    return rate && rate > 2000 ? rate : 3750;
  } catch {
    return 3750; // Bank of Uganda approximate rate as fallback
  }
}

// ── Alpha Vantage (primary source, free API key required) ─────────────────

async function fetchFromAlphaVantage(
  spec: CommoditySpec,
  apiKey: string,
  usdToUgx: number,
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=${spec.fn}&apikey=${apiKey}&interval=monthly`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    // Alpha Vantage rate-limit returns a "Note" field instead of data
    if (!Array.isArray(json.data) || json.data.length === 0) return null;
    const recent = (json.data as Array<{ date: string; value: string }>)
      .find(d => d.value && d.value !== '.');
    if (!recent) return null;
    const raw = parseFloat(recent.value);
    if (!isFinite(raw) || raw <= 0) return null;
    const usdPerKg = spec.toKg(raw);
    return Math.round(usdPerKg * usdToUgx);
  } catch {
    return null;
  }
}

// ── World Bank (fallback, free, no key, monthly) ──────────────────────────
// World Bank returns USD per metric tonne for most commodities.

async function fetchFromWorldBank(
  spec: CommoditySpec,
  usdToUgx: number,
): Promise<number | null> {
  if (!spec.wbIndicator) return null;
  try {
    const url =
      `https://api.worldbank.org/v2/en/country/all/indicator/${spec.wbIndicator}` +
      `?format=json&mrv=2&per_page=5`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    // World Bank API wraps data in a 2-element array: [meta, rows]
    const rows: Array<{ value: number | null; date: string }> = json[1] ?? [];
    const recent = rows.find(r => r.value !== null && r.value !== undefined);
    if (!recent || !recent.value) return null;
    // World Bank prices are usually in USD per metric tonne
    const usdPerTonne = recent.value;
    const usdPerKg = usdPerTonne / 1000;
    return Math.round(usdPerKg * usdToUgx);
  } catch {
    return null;
  }
}

// ── AgriNova's own farmers (real transacted prices) ────────────────────────
// The most locally-relevant price signal isn't a bulletin or a world-market
// quote — it's what buyers on this platform actually paid Ugandan farmers
// this week. Aggregates completed orders (real money changed hands, not
// just an asking price) grouped by crop + pickup district.
async function insertOwnFarmerPrices(supabase: Awaited<ReturnType<typeof createClient>>) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: orders } = await (supabase.from as any)('orders')
    .select('crop_type, unit_price, pickup_district')
    .eq('status', 'completed')
    .gte('completed_at', since)
    .not('unit_price', 'is', null);

  const groups: Record<string, number[]> = {};
  for (const o of (orders ?? [])) {
    if (!o.crop_type || !(o.unit_price > 0)) continue;
    const key = `${o.crop_type}__${o.pickup_district ?? 'National'}`;
    (groups[key] ??= []).push(Number(o.unit_price));
  }

  const rows = Object.entries(groups).map(([key, prices]) => {
    const [crop_type, district] = key.split('__');
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    return {
      crop_type,
      price_per_kg: avg,
      market_name: 'AgriNova Farmers (Actual Sales)',
      district: district === 'National' ? null : district,
      source: 'agrinova-farmers',
      recorded_at: new Date().toISOString(),
    };
  });

  if (rows.length === 0) return { inserted: 0 };
  const { error } = await (supabase.from as any)('market_prices').insert(rows);
  return error ? { inserted: 0, error: error.message } : { inserted: rows.length };
}

// ── Main cron handler ─────────────────────────────────────────────────────

export async function GET(req: Request) {
  const v = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (v !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const avKey = process.env.ALPHAVANTAGE_API_KEY ?? '';
  const [usdToUgx, supabase] = await Promise.all([
    getUsdToUgx(),
    createClient(),
  ]);

  const inserted: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const spec of COMMODITIES) {
    try {
      let priceUgx: number | null = null;
      let source = 'world-market';

      if (avKey) {
        priceUgx = await fetchFromAlphaVantage(spec, avKey, usdToUgx);
        if (priceUgx) source = 'alphavantage';
      }

      if (!priceUgx) {
        priceUgx = await fetchFromWorldBank(spec, usdToUgx);
        if (priceUgx) source = 'world-bank';
      }

      if (!priceUgx || priceUgx <= 0) {
        skipped.push(spec.crop);
        continue;
      }

      const { error } = await (supabase.from as any)('market_prices').insert({
        crop_type:    spec.crop,
        price_per_kg: priceUgx,
        market_name:  spec.market,
        district:     null,
        source,
        recorded_at:  new Date().toISOString(),
      });

      if (error) {
        errors.push(`${spec.crop}: ${error.message}`);
      } else {
        inserted.push(`${spec.crop} @ UGX ${priceUgx.toLocaleString()}/kg (${source})`);
      }
    } catch (err: any) {
      errors.push(`${spec.crop}: ${err?.message ?? 'unknown error'}`);
    }
  }

  const ownFarmers = await insertOwnFarmerPrices(supabase);
  if (ownFarmers.inserted > 0) inserted.push(`agrinova-farmers: ${ownFarmers.inserted} crop/district pairs`);
  if (ownFarmers.error) errors.push(`agrinova-farmers: ${ownFarmers.error}`);

  return NextResponse.json({
    success: true,
    usdToUgx,
    source: avKey ? 'alphavantage+world-bank' : 'world-bank-only',
    inserted,
    skipped,
    errors,
  });
}
