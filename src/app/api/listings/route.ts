import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/supabase/get-profile';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';

const FREE_TIER_ACTIVE_LISTING_CAP = 3;

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const crop     = searchParams.get('crop');
  const district = searchParams.get('district');
  const search   = searchParams.get('q');

  let q = (supabase.from as any)('listings')
    .select('*, farmer:profiles(id, full_name, location, verification_level, trust_score)')
    .eq('status', 'active');

  if (crop)     q = q.eq('crop_type', crop);
  if (district) q = q.eq('district', district);
  if (search)   q = q.ilike('crop_type', `%${search}%`);

  q = q.order('created_at', { ascending: false }).limit(60);
  const { data, error } = await q;
  if (error) {
    console.error('[/api/listings]', error);
    return NextResponse.json({ success: false, error: 'Failed to load listings. Please try again.' }, { status: 500 });
  }

  // Verified farmers get more exposure: rank by verification tier first
  // (gold > blue > green > grey/unverified), keeping recency as the
  // tiebreaker within a tier — mirrors src/app/buyer/listings/page.tsx.
  const TIER_WEIGHT: Record<string, number> = { gold: 3, blue: 2, green: 1, grey: 0 };
  const sorted = [...(data ?? [])].sort((a: any, b: any) =>
    (TIER_WEIGHT[b.farmer?.verification_level ?? 'grey'] ?? 0) - (TIER_WEIGHT[a.farmer?.verification_level ?? 'grey'] ?? 0)
  );

  return NextResponse.json(
    { success: true, data: sorted },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  // Get the profiles.id (different from auth.users.id)
  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 500 });

  const body = await req.json();
  // Accept both camelCase (farmer form) and snake_case (group create page)
  const cropType      = body.cropType      ?? body.crop_type;
  const quantityKg    = body.quantityKg    ?? body.quantity_kg;
  const askingPrice   = body.askingPrice   ?? body.asking_price;
  const availableFrom = body.availableFrom ?? body.available_from;
  const imageUrl      = body.imageUrl      ?? body.image_url;
  const { district, notes, is_group_listing } = body;

  if (!cropType || !district || !(Number(quantityKg) > 0) || !(Number(askingPrice) > 0)) {
    return NextResponse.json({ success: false, error: 'Missing required fields, or quantity/price is not greater than zero' }, { status: 400 });
  }
  if (!imageUrl) {
    return NextResponse.json({ success: false, error: 'A live photo of your produce is required' }, { status: 400 });
  }

  // Free tier is advertised (marketing copy on /premium) as "list up to 3
  // crops at a time" — this was never actually enforced server-side.
  // 'pending_review' counts too, not just 'active': the cap is about how
  // many live-or-about-to-go-live listings a free farmer can hold at once,
  // and a pile of pending listings would otherwise let someone dodge the
  // cap just by never getting approved.
  const { data: profileRow } = await (supabase.from as any)('profiles')
    .select('role, subscription_tier, role_subscription_tiers').eq('user_id', user.id).single();
  if (getEffectiveTier(profileRow ?? {}, 'farmer') === 'free') {
    const { count } = await (supabase.from as any)('listings')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', profile.id)
      .in('status', ['active', 'pending_review']);
    if ((count ?? 0) >= FREE_TIER_ACTIVE_LISTING_CAP) {
      return NextResponse.json({
        success: false,
        error: `Free plan is limited to ${FREE_TIER_ACTIVE_LISTING_CAP} active listings. Pause or sell an existing one, or upgrade to Farmer Pro for unlimited listings.`,
      }, { status: 403 });
    }
  }

  const insertPayload: Record<string, unknown> = {
    farmer_id:      profile.id,
    crop_type:      cropType,
    quantity_kg:    +quantityKg,
    asking_price:   +askingPrice,
    available_from: availableFrom ?? new Date().toISOString().slice(0, 10),
    district,
    notes:          notes ?? null,
    image_url:      imageUrl,
    // Not 'active' — a listing only becomes visible/buyable once an admin
    // approves it (approval_status defaults to 'pending'). Every buyer-
    // facing listings query filters on status = 'active', so this alone is
    // what keeps a brand-new listing off the marketplace until reviewed.
    status:         'pending_review',
  };
  if (is_group_listing) {
    insertPayload.is_group_listing = true;
    insertPayload.group_id = user.id;
  }

  const { data, error } = await (supabase.from as any)('listings').insert(insertPayload).select().single();

  if (error) {
    console.error('[/api/listings]', error);
    return NextResponse.json({ success: false, error: 'Failed to create listing. Please try again.' }, { status: 500 });
  }
  revalidatePath('/farmer/dashboard');
  revalidatePath('/farmer/marketplace');
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

  // A farmer can pause or manually mark their own listing sold, but can't
  // self-set 'active' — that would skip the admin approval gate that decides
  // whether a listing is allowed on the marketplace at all.
  const FARMER_SETTABLE_STATUSES = ['inactive', 'sold'];
  if (!FARMER_SETTABLE_STATUSES.includes(status)) {
    return NextResponse.json({ success: false, error: `You can only set status to: ${FARMER_SETTABLE_STATUSES.join(', ')}` }, { status: 403 });
  }

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 500 });

  const { error } = await (supabase.from as any)('listings')
    .update({ status })
    .eq('id', id)
    .eq('farmer_id', profile.id);
  if (error) {
    console.error('[/api/listings]', error);
    return NextResponse.json({ success: false, error: 'Failed to update listing status. Please try again.' }, { status: 500 });
  }
  revalidatePath('/farmer/dashboard');
  revalidatePath('/farmer/marketplace');
  return NextResponse.json({ success: true });
}
