import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — distinct pickup/dropoff districts from the caller's own past
// delivery requests, most-recent-first, for the "Recent" shortcut in the
// map screen's destination search sheet.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await (supabase.from as any)('delivery_requests')
    .select('pickup_district, dropoff_district')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const pickup: string[] = [];
  const dropoff: string[] = [];
  for (const row of (data ?? []) as any[]) {
    if (row.pickup_district && !pickup.includes(row.pickup_district)) pickup.push(row.pickup_district);
    if (row.dropoff_district && !dropoff.includes(row.dropoff_district)) dropoff.push(row.dropoff_district);
  }

  return NextResponse.json({ pickup: pickup.slice(0, 4), dropoff: dropoff.slice(0, 4) });
}
