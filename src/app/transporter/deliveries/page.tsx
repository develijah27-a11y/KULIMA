import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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

  const { tab = 'available', district = '' } = await searchParams;
  const tabs = ['available', 'my_bids', 'active', 'completed'];

  let query: any;

  if (tab === 'available') {
    query = (supabase.from as any)('delivery_requests')
      .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, notes, created_at')
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
    open:      { color: '#059669', bg: '#D1FAE5', label: 'Open' },
    assigned:  { color: '#0284C7', bg: '#DBEAFE', label: 'Assigned' },
    in_transit:{ color: '#D97706', bg: '#FEF3C7', label: 'In Transit' },
    delivered: { color: '#7C3AED', bg: '#EDE9FE', label: 'Delivered' },
    pending:   { color: '#D97706', bg: '#FEF3C7', label: 'Bid Pending' },
    accepted:  { color: '#059669', bg: '#D1FAE5', label: 'Bid Accepted' },
    rejected:  { color: '#DC2626', bg: '#FEF2F2', label: 'Bid Rejected' },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Delivery Jobs
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Browse and manage your deliveries</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <a key={t} href={`/transporter/deliveries?tab=${t}`}
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: 'none', textTransform: 'capitalize', background: tab === t ? C.green : '#F3F4F6', color: tab === t ? '#fff' : C.muted }}>
            {t.replace('_', ' ')}
          </a>
        ))}
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>🚛</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No deliveries here</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map((row: any) => {
              const d     = tab === 'my_bids' ? row.delivery : row;
              const st    = STATUS_CFG[tab === 'my_bids' ? row.status : d?.status] ?? STATUS_CFG.open;
              const price = tab === 'my_bids' ? row.price : d?.agreed_price;
              return (
                <div key={row.id} style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
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
                      {price && ` · UGX ${Math.round(price).toLocaleString()}`}
                    </p>
                  </div>
                  {tab === 'available' && (
                    <Link href={`/transporter/deliveries/${row.id}`}
                      style={{ padding: '6px 14px', background: '#F0FDF4', color: C.greenMed, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                      Bid →
                    </Link>
                  )}
                  {tab === 'active' && d?.status === 'assigned' && (
                    <Link href={`/transporter/deliveries/${row.id}`}
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
