import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { JSX } from 'react';
import { Bell, Truck, Snowflake, Zap } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

export default async function TransporterDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; district?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { tab = 'assignments', district = '' } = await searchParams;
  const tabs = ['assignments', 'available', 'active', 'completed'];

  let query: any;

  if (tab === 'assignments') {
    query = (supabase.from as any)('driver_assignments')
      .select('id, status, notified_at, delivery:delivery_requests(id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, status, estimated_fare, driver_earnings, delivery_type)')
      .eq('driver_id', user.id)
      .in('status', ['pending', 'accepted'])
      .order('notified_at', { ascending: false });
  } else if (tab === 'available') {
    query = (supabase.from as any)('delivery_requests')
      .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, notes, created_at, estimated_fare, driver_earnings, delivery_type')
      .eq('status', 'open')
      .order('pickup_date', { ascending: true });
    if (district) query = query.eq('pickup_district', district);
  } else if (tab === 'my_bids') {
    query = (supabase.from as any)('delivery_bids')
      .select('id, price, status, created_at, delivery:delivery_requests(id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, status)')
      .eq('transporter_id', user.id)
      .order('created_at', { ascending: false });
  } else if (tab === 'active') {
    query = (supabase.from as any)('delivery_requests')
      .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, status, agreed_price')
      .eq('transporter_id', user.id)
      .in('status', ['assigned', 'in_transit'])
      .order('pickup_date', { ascending: true });
  } else {
    query = (supabase.from as any)('delivery_requests')
      .select('id, pickup_district, dropoff_district, cargo_kg, status, agreed_price, pickup_date')
      .eq('transporter_id', user.id)
      .eq('status', 'delivered')
      .order('pickup_date', { ascending: false })
      .limit(30);
  }

  const { data } = await query;
  const rows = data ?? [];

  const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
    open:      { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Open' },
    assigned:  { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)',     label: 'Assigned' },
    in_transit:{ color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'In Transit' },
    delivered: { color: 'var(--color-purple)',  bg: 'var(--color-purple-bg)', label: 'Delivered' },
    pending:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Bid Pending' },
    accepted:  { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Bid Accepted' },
    rejected:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Bid Rejected' },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Delivery Jobs
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Browse and manage your deliveries</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <a key={t} href={`/transporter/deliveries?tab=${t}`}
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: 'none', background: tab === t ? C.green : 'var(--color-surface-2)', color: tab === t ? '#fff' : C.muted }}>
            {t === 'assignments' ? <><Bell size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />My Jobs</> : t === 'available' ? 'Browse' : t === 'active' ? 'Active' : 'Completed'}
          </a>
        ))}
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--d-muted)' }}><Truck size={48} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>
            {tab === 'assignments'
              ? 'No jobs assigned to you yet — make sure your vehicle district is set'
              : 'No deliveries here'}
          </p>
          {tab === 'assignments' && (
            <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
              Go to <Link href="/transporter/vehicle" style={{ color: C.green }}>My Vehicle</Link> and select your operating districts
            </p>
          )}
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map((row: any) => {
              const isAssignment = tab === 'assignments';
              const d     = isAssignment ? row.delivery : (tab === 'my_bids' ? row.delivery : row);
              // Guard: skip rows where the delivery join returned null
              if (!d) return null;
              const st    = STATUS_CFG[isAssignment ? (row.status === 'accepted' ? 'accepted' : 'open') : (tab === 'my_bids' ? row.status : d?.status)] ?? STATUS_CFG.open;
              const price = isAssignment ? (d?.driver_earnings ?? d?.estimated_fare) : (tab === 'my_bids' ? row.price : d?.agreed_price);
              const typeIcon: JSX.Element = d?.delivery_type === 'cold' ? <Snowflake size={14} style={{ color: '#0EA5E9' }} /> : d?.delivery_type === 'fast' ? <Zap size={14} style={{ color: 'var(--color-harvest)' }} /> : <Truck size={14} style={{ color: 'var(--color-primary)' }} />;
              return (
                <div key={row.id} style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      {isAssignment && <span style={{ display: 'flex' }}>{typeIcon}</span>}
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
                        {d?.pickup_district ?? '—'} → {d?.dropoff_district ?? '—'}
                      </p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color, flexShrink: 0 }}>
                        {st.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      {d?.cargo_kg} kg {d?.cargo_type ?? 'cargo'}
                      {d?.pickup_date && ` · ${new Date(d.pickup_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}`}
                      {price && (
                        <>
                          {` · `}
                          <span style={{ fontWeight: 700, color: C.greenMed }}>
                            UGX {Math.round(price).toLocaleString()}
                          </span>
                          {` your earnings`}
                          {/* Show if driver_earnings is set and differs from estimated_fare,
                              so driver knows this is their net amount after platform fee */}
                          {d?.driver_earnings && d?.estimated_fare && d.driver_earnings !== d.estimated_fare && (
                            <span
                              title={`Total fare: UGX ${Math.round(d.estimated_fare).toLocaleString()}\nYour earnings: UGX ${Math.round(d.driver_earnings).toLocaleString()}\nPlatform service fee: UGX ${Math.round(d.estimated_fare - d.driver_earnings).toLocaleString()}`}
                              style={{ marginLeft: 4, fontSize: 10, cursor: 'help', border: '1px solid var(--d-border)', borderRadius: 99, padding: '0 5px', lineHeight: '16px', display: 'inline-block' }}
                            >?</span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  {isAssignment && d?.id && (
                    <Link href={`/transporter/deliveries/${d.id}`}
                      style={{ padding: '6px 14px', background: C.green, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                      Accept →
                    </Link>
                  )}
                  {tab === 'available' && (
                    <Link href={`/transporter/deliveries/${row.id}`}
                      style={{ padding: '6px 14px', background: 'var(--color-primary-bg)', color: C.greenMed, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                      Bid →
                    </Link>
                  )}
                  {tab === 'active' && d?.status === 'assigned' && d?.id && (
                    <Link href={`/transporter/deliveries/${d.id}`}
                      style={{ padding: '6px 14px', background: C.green, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                      Start →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
