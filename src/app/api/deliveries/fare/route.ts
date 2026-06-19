import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calcFare, type DeliveryType } from '@/lib/delivery-pricing';

const VALID_TYPES: DeliveryType[] = ['cold', 'fast', 'standard'];

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to   = searchParams.get('to')   ?? '';
  const kg   = parseFloat(searchParams.get('kg') ?? '0');
  const type = (searchParams.get('type') ?? 'standard') as DeliveryType;

  if (!from || !to)              return NextResponse.json({ error: 'from and to districts required' }, { status: 400 });
  if (!kg || kg <= 0)            return NextResponse.json({ error: 'kg must be > 0' }, { status: 400 });
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Invalid delivery type' }, { status: 400 });

  const fare = calcFare(from, to, kg, type);
  return NextResponse.json({ fare });
}
