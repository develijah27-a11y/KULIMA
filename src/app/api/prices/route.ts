import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUnifiedMarketPrices } from '@/lib/prices';
import { revalidateTag } from 'next/cache';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get('crop') ?? undefined;
  const district = searchParams.get('district') ?? undefined;

  const result = await getUnifiedMarketPrices({ crop, district });

  return NextResponse.json(
    {
      success: true,
      data: result.prices,
      averages: result.averages,
      dailyTrends: result.dailyTrends,
      summary: result.summary,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cropType, marketName, district, pricePerKg, source } = body;
    if (!cropType || !marketName || !pricePerKg) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing required fields: cropType, marketName, pricePerKg' } },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const { error } = await (supabase.from as any)('market_prices').insert({
      crop_type: cropType.toLowerCase(),
      market_name: marketName,
      district: district ?? null,
      price_per_kg: Number(pricePerKg),
      source: source ?? 'user_submission',
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('[prices/POST] Supabase insert note:', error);
    }

    try {
      revalidateTag('prices', 'default');
    } catch {
      // ignore outside request scope
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err?.message ?? 'Server error' } }, { status: 500 });
  }
}
