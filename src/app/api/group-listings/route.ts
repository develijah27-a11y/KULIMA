import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { crop_type, total_quantity_kg, asking_price, district, notes, member_count, contributions } = body;

  if (!crop_type || !total_quantity_kg || !asking_price || !district) {
    return NextResponse.json({ error: 'crop_type, total_quantity_kg, asking_price, and district are required' }, { status: 400 });
  }

  // Optional: per-member quantity breakdown, used to split the payout
  // proportionally once this listing sells. Must sum to the total.
  if (contributions) {
    if (!Array.isArray(contributions) || contributions.length === 0) {
      return NextResponse.json({ error: 'contributions must be a non-empty array' }, { status: 400 });
    }
    const sum = contributions.reduce((s: number, c: any) => s + Number(c.quantity_kg || 0), 0);
    if (Math.abs(sum - Number(total_quantity_kg)) > 0.5) {
      return NextResponse.json({ error: `Member quantities (${sum}kg) must add up to the total (${total_quantity_kg}kg)` }, { status: 400 });
    }
  }

  const { data, error } = await (supabase.from as any)('group_listings').insert({
    admin_id:          user.id,
    crop_type,
    total_quantity_kg: +total_quantity_kg,
    asking_price:      +asking_price,
    district,
    notes:             notes ?? null,
    member_count:      member_count ?? 1,
    status:            'active',
  }).select().single();

  if (error) {
    console.error('[/api/group-listings POST]', error);
    return NextResponse.json({ error: 'Failed to publish group listing. Please try again.' }, { status: 500 });
  }

  if (contributions && data) {
    const rows = contributions
      .filter((c: any) => Number(c.quantity_kg) > 0)
      .map((c: any) => ({ group_listing_id: data.id, farmer_id: c.farmer_id, quantity_kg: Number(c.quantity_kg) }));
    const { error: contribErr } = await (supabase.from as any)('group_listing_contributions').insert(rows);
    if (contribErr) {
      // Listing was created but contributions failed to save — surface this
      // clearly rather than silently falling back to pooled-wallet payout.
      console.error('[/api/group-listings POST]', contribErr);
      return NextResponse.json({ success: true, data, warning: 'Listing published, but member quantities were not saved. Please try again or contact support.' }, { status: 201 });
    }
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const crop     = searchParams.get('crop');
  const district = searchParams.get('district');
  const id       = searchParams.get('id');

  // Single listing detail
  if (id) {
    const { data, error } = await (supabase.from as any)('group_listings')
      .select('id, admin_id, crop_type, total_quantity_kg, asking_price, district, member_count, notes, status, created_at')
      .eq('id', id)
      .eq('status', 'active')
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data });
  }

  // List all active
  let query = (supabase.from as any)('group_listings')
    .select('id, admin_id, crop_type, total_quantity_kg, asking_price, district, member_count, notes, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(60);

  if (crop)     query = query.eq('crop_type', crop);
  if (district) query = query.eq('district', district);

  const { data, error } = await query;
  if (error) return NextResponse.json({ data: [] });
  return NextResponse.json(
    { data: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
