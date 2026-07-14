import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActiveJobsClient } from './ActiveJobsClient';

export default async function ActiveJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [{ data: pending }, { data: active }, { data: completed }] = await Promise.all([
    (supabase.from as any)('driver_assignments')
      .select(`
        id, status, notified_at,
        delivery:delivery_requests(
          id, pickup_district, pickup_location, dropoff_district, dropoff_location,
          cargo_kg, cargo_type, delivery_type, estimated_fare, distance_km,
          driver_earnings, pickup_date, notes
        )
      `)
      .eq('driver_id', user.id)
      .eq('status', 'pending')
      .order('notified_at', { ascending: false })
      .limit(20),
    (supabase.from as any)('delivery_requests')
      .select(`
        id, pickup_district, pickup_location, dropoff_district, dropoff_location,
        cargo_kg, cargo_type, delivery_type, estimated_fare, driver_earnings,
        distance_km, status, accepted_at, picked_up_at, pickup_date,
        requester:profiles!delivery_requests_requester_profile_fkey(full_name, phone_number)
      `)
      .eq('transporter_id', user.id)
      .in('status', ['assigned', 'in_transit'])
      .order('accepted_at', { ascending: false }),
    (supabase.from as any)('delivery_requests')
      .select(`
        id, pickup_district, dropoff_district, cargo_kg, delivery_type,
        driver_earnings, status, payment_status, delivered_at
      `)
      .eq('transporter_id', user.id)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <ActiveJobsClient
      pending={pending ?? []}
      active={active ?? []}
      completed={completed ?? []}
    />
  );
}
