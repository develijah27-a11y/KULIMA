import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const GET = async (req: Request) => {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get('crop');
  const district = searchParams.get('district');

  let q = supabase.from('listings').select('*, farmer:profiles(name,location,district)').eq('status', 'active');
  if (crop) q = q.eq('crop_type', crop);
  if (district) q = q.eq('district', district);
  q = q.order('created_at', { ascending: false });
  const { data } = await q;
  return NextResponse.json({ success: true, data: (data ?? []).map(listingToDomain) });
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cropType, quantityKg, askingPrice, availableFrom, district } = body;
    if (!cropType || !quantityKg || !askingPrice) return NextResponse.json({ success: false, error: { message: 'Missing fields' } }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await supabase.from('listings').insert({ farmer_id: user.id, crop_type: cropType, quantity_kg: +quantityKg, asking_price: +askingPrice, available_from: availableFrom ?? new Date().toISOString().slice(0, 10), district, status: 'active' });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}

function listingToDomain(l: any) {
  return {
    id: l.id, farmerId: l.farmer_id, cropType: l.crop_type, quantityKg: +l.quantity_kg,
    askingPrice: +l.asking_price, availableFrom: l.available_from, district: l.district,
    status: l.status, farmerName: l.farmer?.name, farmerDistrict: l.farmer?.district ?? l.farmer?.location,
  };
}
