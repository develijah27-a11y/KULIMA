import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — a transporter's own device reports its current position while
// their vehicle is marked available, so requesters can see them on the
// nearby-drivers map before any delivery exists. The .eq('is_available',
// true) guard means this silently no-ops the moment a driver goes
// unavailable — no separate "stop broadcasting" call needed, and a driver
// who goes offline stops appearing on the map within one stale-freshness
// window (see /api/vehicles/nearby) without their last position lingering
// as "live".
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lat, lng } = await req.json();
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng (numbers) are required' }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const { error, count } = await (supabase.from as any)('vehicles')
    .update({ current_lat: lat, current_lng: lng, location_updated_at: new Date().toISOString() }, { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_available', true);

  if (error) {
    console.error('[/api/transporter/presence POST]', error);
    return NextResponse.json({ error: 'Failed to update location. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, broadcasting: (count ?? 0) > 0 });
}
