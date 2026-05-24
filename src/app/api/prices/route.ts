import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

export async function GET(req: Request) {
  return NextResponse.json({ success: true, data: [], note: 'Prices API — add table to schema first' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cropType, marketName, district, pricePerKg, source } = body;
    if (!cropType || !marketName || !pricePerKg) return NextResponse.json({ success: false, error: { message: 'Missing fields' } }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    revalidateTag('prices', 'default');
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}
