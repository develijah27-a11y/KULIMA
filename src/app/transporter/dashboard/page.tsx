import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const STATUS_CFG = {
  open:        { color: '#059669', bg: '#D1FAE5', label: 'Open' },
  assigned:    { color: '#0284C7', bg: '#DBEAFE', label: 'Assigned' },
  in_transit:  { color: '#D97706', bg: '#FEF3C7', label: 'In Transit' },
  delivered:   { color: '#7C3AED', bg: '#EDE9FE', label: 'Delivered' },
  cancelled:   { color: '#DC2626', bg: '#FEF2F2', label: 'Cancelled' },
} as const;

export default async function TransporterDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [vehicleRes, openRes, myDeliveriesRes, walletRes] = await Promise.all([
    (supabase.from as any)('vehicles').select('id, plate_number, vehicle_type, capacity_kg, is_available').eq('user_id', user.id).maybeSingle(),
    (supabase.from as any)('delivery_requests').select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, created_at').eq('status', 'open').order('pickup_date', { ascending: true }).limit(10),
    (supabase.from as any)('delivery_requests').select('id, pickup_district, dropoff_district, cargo_kg, status, pickup_date').eq('transporter_id', user.id).order('created_at', { ascending: false }).limit(10),
    (supabase.from as any)('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
  ]);

  const vehicle      = vehicleRes.data;
  const openJobs     = openRes.data ?? [];
  const myDeliveries = myDeliveriesRes.data ?? [];
  const balance      = walletRes.data?.balance ?? 0;
  const active       = myDeliveries.filter((d: any) => ['assigned','in_transit'].includes(d.status)).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Transporter Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Manage your deliveries and earnings</p>
      </div>

      {/* No vehicle warning */}
      {!vehicle && (
        <div style={{ background: '#FFFBEB', borderRadius: 14, border: '1px solid #FDE68A', padding: '16px 18px' }}>
          <p style={{ color: '#D97706', fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>Register Your Vehicle</p>
          <p style={{ color: '#92400E', fontSize: 12, margin: '0 0 12px' }}>You need to register a vehicle before accepting deliveries.</p>
          <Link href="/transporter/vehicle" style={{ display: 'inline-block', padding: '8px 16px', background: '#D97706', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Register Vehicle →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: C.green, letterSpacing: '-0.03em' }}>{active}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: C.muted }}>Active Jobs</p>
        </div>
        <div style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p className="text-2xl font-black" style={{ color: C.green, letterSpacing: '-0.03em' }}>{openJobs.length}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: C.muted }}>Open Jobs</p>
        </div>
        <div style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p className="text-xl font-black" style={{ color: C.green, letterSpacing: '-0.03em', fontSize: 14 }}>
            {Math.round(balance).toLocaleString()}
          </p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: C.muted }}>UGX Balance</p>
        </div>
      </div>

      {/* Vehicle card */}
      {vehicle && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
            🚛
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{vehicle.plate_number}</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
              {vehicle.vehicle_type} · {vehicle.capacity_kg} kg capacity
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: vehicle.is_available ? '#D1FAE5' : '#FEF2F2', color: vehicle.is_available ? '#059669' : '#DC2626' }}>
              {vehicle.is_available ? 'Available' : 'Busy'}
            </span>
            <Link href="/transporter/vehicle" style={{ fontSize: 12, color: C.greenMed, fontWeight: 600, textDecoration: 'none' }}>Edit</Link>
          </div>
        </div>
      )}

      {/* Open jobs */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Available Jobs</p>
          <Link href="/transporter/deliveries" style={{ fontSize: 12, color: C.greenMed, fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
        </div>

        {openJobs.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>No open delivery jobs right now</p>
          </div>
        ) : (
          <div>
            {openJobs.slice(0, 5).map((job: any) => (
              <div key={job.id} style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
                    {job.pickup_district} → {job.dropoff_district}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    {job.cargo_kg} kg {job.cargo_type ?? 'cargo'} · {new Date(job.pickup_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <Link
                  href={`/transporter/deliveries/${job.id}`}
                  style={{ padding: '6px 14px', background: '#F0FDF4', color: C.greenMed, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                >
                  Bid →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My active deliveries */}
      {myDeliveries.filter((d: any) => ['assigned','in_transit'].includes(d.status)).length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>My Active Deliveries</p>
          </div>
          <div>
            {myDeliveries.filter((d: any) => ['assigned','in_transit'].includes(d.status)).map((d: any) => {
              const st = STATUS_CFG[d.status as keyof typeof STATUS_CFG];
              return (
                <div key={d.id} style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
                      {d.pickup_district} → {d.dropoff_district}
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{d.cargo_kg} kg</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
