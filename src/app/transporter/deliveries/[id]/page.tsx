import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BidForm } from './BidForm';
import { Check } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [deliveryRes, vehicleRes, existingBidRes] = await Promise.all([
    (supabase.from as any)('delivery_requests')
      .select('*, requester:profiles!delivery_requests_requester_id_fkey(full_name, verification_level)')
      .eq('id', id)
      .single(),
    (supabase.from as any)('vehicles').select('id, plate_number, vehicle_type, capacity_kg').eq('user_id', user.id).maybeSingle(),
    (supabase.from as any)('delivery_bids').select('id, price, status').eq('delivery_id', id).eq('transporter_id', user.id).maybeSingle(),
  ]);

  const delivery = deliveryRes.data;
  if (!delivery) notFound();

  const vehicle     = vehicleRes.data;
  const existingBid = existingBidRes.data;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/transporter/deliveries" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← Deliveries</Link>

      {/* Delivery details */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🚛</div>
          <div>
            <h1 className="text-lg font-black" style={{ color: C.text, letterSpacing: '-0.02em', margin: '0 0 2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {delivery.pickup_district} → {delivery.dropoff_district}
            </h1>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
              {delivery.cargo_kg} kg {delivery.cargo_type ?? 'cargo'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Pickup District', value: delivery.pickup_district },
            { label: 'Dropoff District', value: delivery.dropoff_district },
            { label: 'Pickup Location', value: delivery.pickup_location ?? '—' },
            { label: 'Dropoff Location', value: delivery.dropoff_location ?? '—' },
            { label: 'Pickup Date', value: new Date(delivery.pickup_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Cargo Weight', value: `${delivery.cargo_kg} kg` },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 8 }}>
              <p style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {delivery.notes && (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 14, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8 }}>
            📝 {delivery.notes}
          </p>
        )}
      </div>

      {/* Bid section */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        {!vehicle ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Register your vehicle first to bid on jobs</p>
            <Link href="/transporter/vehicle" style={{ display: 'inline-block', padding: '9px 18px', background: C.green, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Register Vehicle →
            </Link>
          </div>
        ) : existingBid ? (
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>Your Bid</p>
            <div style={{ padding: '12px 14px', background: existingBid.status === 'accepted' ? 'var(--color-success-bg)' : existingBid.status === 'rejected' ? 'var(--color-danger-bg)' : 'var(--color-harvest-bg)', borderRadius: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: existingBid.status === 'accepted' ? 'var(--color-success)' : existingBid.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-harvest)', margin: '0 0 3px' }}>
                UGX {Math.round(existingBid.price).toLocaleString()}
              </p>
              <p style={{ fontSize: 11, fontWeight: 600, color: existingBid.status === 'accepted' ? 'var(--color-success)' : existingBid.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-harvest)', margin: 0 }}>
                {existingBid.status === 'accepted' ? <><Check size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3 }} />Bid accepted! Check your active deliveries.</> : existingBid.status === 'rejected' ? 'Bid rejected' : 'Awaiting response'}
              </p>
            </div>
          </div>
        ) : delivery.status !== 'open' ? (
          <p style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>This delivery has already been assigned.</p>
        ) : (
          <BidForm deliveryId={id} vehicle={vehicle} />
        )}
      </div>
    </div>
  );
}
