import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUsers } from '@/lib/notify';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from as any)('offtaker_contracts')
    .select('*')
    .eq('offtaker_id', user.id)
    .order('delivery_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[/api/offtaker-contracts]', error);
    return NextResponse.json({ error: 'Failed to load contracts.' }, { status: 500 });
  }
  return NextResponse.json(
    { contracts: data ?? [] },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { crop_type, district, quantity_kg, price_ugx, delivery_date, farmer_name, notes } = body;

  if (!crop_type || !district || !quantity_kg || !price_ugx || !delivery_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Find candidate farmers to auto-surface this contract to, instead of it
  // just sitting as the offtaker's own paperwork: farmers this offtaker has
  // contracted with before for the same crop (ranked by how often), plus
  // anyone they've favourited — capped so one contract doesn't spam a huge
  // favourites list.
  const admin = createServiceRoleClient();

  const [{ data: pastContracts }, { data: favourites }] = await Promise.all([
    (admin.from as any)('offtaker_contracts')
      .select('farmer_id')
      .eq('offtaker_id', user.id)
      .eq('crop_type', crop_type)
      .not('farmer_id', 'is', null),
    (admin.from as any)('buyer_favourites').select('farmer_id').eq('buyer_id', user.id),
  ]);

  const frequencyCount = new Map<string, number>();
  (pastContracts ?? []).forEach((c: any) => frequencyCount.set(c.farmer_id, (frequencyCount.get(c.farmer_id) ?? 0) + 1));
  const frequentFarmerIds = [...frequencyCount.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 3);
  const favouriteFarmerIds = (favourites ?? []).map((f: any) => f.farmer_id).slice(0, 3);
  const candidateIds = [...new Set([...frequentFarmerIds, ...favouriteFarmerIds])].slice(0, 5);

  const { data, error } = await (supabase.from as any)('offtaker_contracts').insert({
    offtaker_id:   user.id,
    crop_type,
    district,
    quantity_kg:   Number(quantity_kg),
    price_ugx:     Number(price_ugx),
    delivery_date,
    farmer_name:   farmer_name ?? null,
    notes:         notes ?? null,
    status:        candidateIds.length > 0 ? 'offered' : 'active',
    payment_status: 'pending',
    created_at:    new Date().toISOString(),
  }).select().single();

  if (error) {
    console.error('[/api/offtaker-contracts]', error);
    return NextResponse.json({ error: 'Failed to create the contract.' }, { status: 500 });
  }

  if (candidateIds.length > 0) {
    try {
      await (admin.from as any)('offtaker_contract_offers').insert(
        candidateIds.map(farmerId => ({ contract_id: data.id, farmer_id: farmerId, status: 'notified' })),
      );
      const { data: farmerProfiles } = await admin.from('profiles').select('id, user_id').in('id', candidateIds);
      const { data: myProfile } = await admin.from('profiles').select('full_name').eq('user_id', user.id).single();
      const notifRows = (farmerProfiles ?? []).map((p: any) => ({
        userId: p.user_id,
        role: 'farmer',
        type: 'offer',
        title: 'New contract offer',
        body: `${(myProfile as any)?.full_name ?? 'A bulk buyer'} wants ${quantity_kg}kg of ${crop_type} at UGX ${Math.round(price_ugx).toLocaleString()}/kg, delivered by ${new Date(delivery_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}.`,
        data: { contract_id: data.id },
        url: '/farmer/contract-offers',
      }));
      if (notifRows.length > 0) await notifyUsers(admin, notifRows);
    } catch (e) {
      console.error('[/api/offtaker-contracts] offer notification', e);
    }
  }

  return NextResponse.json({ contract: data }, { status: 201 });
}
