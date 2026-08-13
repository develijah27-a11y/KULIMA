import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Vercel cron — runs monthly on the 16th at 06:00 EAT (03:00 UTC), a day
// after this source's own mid-month publication date, so this always picks
// up that month's freshly published numbers rather than re-fetching last
// month's file a day early.
//
// Source: WFP's Uganda-specific food price dataset (jointly compiled with
// UBOS, FAO/GIEWS, and the Uganda Grain Council), published via the UN's
// Humanitarian Data Exchange. Free, no API key, no scraping — a real
// structured CSV, updated monthly by the source itself. Running this any
// more often than monthly would just re-download the same file; the
// underlying district survey genuinely doesn't change more than once a
// month (true of this kind of market survey everywhere, not a limitation
// of this code).
//
// Deliberately NOT run through OpenAI: this data already arrives
// structured, so an LLM extraction step would only add cost, latency, and
// a chance of misreading a number a CSV parser gets right every time.

const SOURCE_CSV_URL =
  'https://data.humdata.org/dataset/883929b1-521e-4834-97f5-0ccc2df75b89/resource/e082d683-cad5-4dcd-bf54-db76ae254d33/download/wfp_food_prices_uga.csv';

// WFP's commodity names → this app's crop_type taxonomy. Deliberately only
// maps raw/staple crops (skips processed goods like "Maize flour" and
// non-food items like soap/batteries that the same survey also tracks for
// unrelated humanitarian monitoring purposes).
const COMMODITY_MAP: Record<string, string> = {
  'Maize': 'maize',
  'Maize (white)': 'maize',
  'Beans': 'beans',
  'Cassava (fresh)': 'cassava',
  'Rice': 'rice',
  'Sorghum': 'sorghum',
  'Millet': 'millet',
  'Plantains': 'banana',
};

interface PriceRow {
  date: string;
  admin2: string;
  market: string;
  commodity: string;
  unit: string;
  currency: string;
  price: string;
}

// Minimal CSV line splitter with basic quoted-field support — this source
// has never used embedded commas in practice (checked the actual data
// before writing this), but district/market names are free text from a
// government survey and there's no guarantee that stays true forever.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export async function GET(req: Request) {
  const auth = req.headers.get('x-vercel-secret') ?? req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  let rows: PriceRow[];
  try {
    const res = await fetch(SOURCE_CSV_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Source returned ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const header = parseCsvLine(lines[0]);
    const idx = (col: string) => header.indexOf(col);
    const [dateI, admin2I, marketI, commodityI, unitI, currencyI, priceI] = [
      idx('date'), idx('admin2'), idx('market'), idx('commodity'), idx('unit'), idx('currency'), idx('price'),
    ];
    if ([dateI, admin2I, marketI, commodityI, unitI, currencyI, priceI].some(i => i === -1)) {
      throw new Error('Unexpected CSV structure — expected columns missing');
    }
    rows = lines.slice(1).map(line => {
      const f = parseCsvLine(line);
      return { date: f[dateI], admin2: f[admin2I], market: f[marketI], commodity: f[commodityI], unit: f[unitI], currency: f[currencyI], price: f[priceI] };
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: `Failed to fetch/parse source: ${err?.message ?? 'unknown'}` }, { status: 502 });
  }

  // Keep only mapped staple crops, priced in UGX per KG, with a valid
  // positive number — anything else (non-food items, other units/
  // currencies the same survey tracks) isn't a crop price and would
  // corrupt market_prices if inserted.
  const relevant = rows.filter(r =>
    COMMODITY_MAP[r.commodity] &&
    r.unit === 'KG' &&
    r.currency === 'UGX' &&
    isFinite(parseFloat(r.price)) && parseFloat(r.price) > 0 &&
    r.admin2 && r.date,
  );

  // Keep only the single most recent row per (crop, district) — the source
  // file contains the full history back to 2006, not just this month.
  const latest = new Map<string, PriceRow>();
  for (const r of relevant) {
    const key = `${COMMODITY_MAP[r.commodity]}__${r.admin2}`;
    const existing = latest.get(key);
    if (!existing || r.date > existing.date) latest.set(key, r);
  }

  // Only insert rows genuinely newer than what's already stored for that
  // crop+district — re-running this job (retries, manual triggers) must
  // never duplicate the same month's data, but a real new month's number
  // must still land as its own new historical row so month-over-month
  // comparisons actually show real change over time, not a single row
  // getting silently overwritten in place.
  const { data: existingRows } = await (supabase.from as any)('market_prices')
    .select('crop_type, district, recorded_at')
    .eq('source', 'wfp-uganda');

  const latestKnown = new Map<string, string>();
  for (const r of (existingRows ?? [])) {
    const key = `${r.crop_type}__${r.district}`;
    const prev = latestKnown.get(key);
    if (!prev || r.recorded_at > prev) latestKnown.set(key, r.recorded_at);
  }

  const toInsert: any[] = [];
  const skippedAlreadyCurrent: string[] = [];
  for (const [key, row] of latest) {
    const [crop, district] = key.split('__');
    const recordedAt = new Date(row.date).toISOString();
    const known = latestKnown.get(key);
    if (known && known.slice(0, 10) >= recordedAt.slice(0, 10)) {
      skippedAlreadyCurrent.push(key);
      continue;
    }
    toInsert.push({
      crop_type: crop,
      price_per_kg: Math.round(parseFloat(row.price)),
      market_name: row.market,
      district: row.admin2,
      source: 'wfp-uganda',
      recorded_at: recordedAt,
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, skipped: skippedAlreadyCurrent.length, message: 'No new months to record yet' });
  }

  const { error } = await (supabase.from as any)('market_prices').insert(toInsert);
  if (error) {
    return NextResponse.json({ success: false, error: error.message, attempted: toInsert.length }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    inserted: toInsert.length,
    skipped: skippedAlreadyCurrent.length,
    crops: [...new Set(toInsert.map(r => r.crop_type))],
    districts: [...new Set(toInsert.map(r => r.district))].length,
  });
}
