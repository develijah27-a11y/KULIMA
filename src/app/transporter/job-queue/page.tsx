import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Mbarara','Gulu','Lira',
  'Masaka','Fort Portal','Arua','Soroti','Kabale','Hoima','Kasese',
];

export default async function JobQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; cargo?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { district = '', cargo = '' } = await searchParams;

  const [jobsRes, myBidsRes, vehicleRes] = await Promise.all([
    (() => {
      let q = (supabase.from as any)('delivery_requests')
        .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, pickup_date, pickup_location, notes, created_at')
        .eq('status', 'open')
        .order('pickup_date', { ascending: true })
        .limit(50);
      if (district) q = q.eq('pickup_district', district);
      if (cargo)    q = q.ilike('cargo_type', `%${cargo}%`);
      return q;
    })(),
    (supabase.from as any)('delivery_bids')
      .select('delivery_id, status')
      .eq('transporter_id', user.id),
    (supabase.from as any)('vehicles')
      .select('id, capacity_kg, is_available')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const jobs    = jobsRes.data ?? [];
  const myBids  = myBidsRes.data ?? [];
  const vehicle = vehicleRes.data;
  const bidMap  = new Map(myBids.map((b: any) => [b.delivery_id, b.status]));

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Job Queue
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {jobs.length} open {jobs.length === 1 ? 'job' : 'jobs'} available
        </p>
      </div>

      {!vehicle && (
        <div style={{ background: '#FFFBEB', borderRadius: 14, border: '1px solid #FDE68A', padding: '14px 18px' }}>
          <p style={{ color: '#92400E', fontSize: 13, margin: '0 0 8px', fontWeight: 700 }}>Register a vehicle to bid on jobs</p>
          <Link href="/transporter/vehicle" style={{ fontSize: 12, color: '#D97706', fontWeight: 700, textDecoration: 'none' }}>
            Register now →
          </Link>
        </div>
      )}

      {/* Filters */}
      <form method="GET" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="district" defaultValue={district}
          style={{ flex: 1, minWidth: 140, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
          <option value="">All Districts</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input name="cargo" type="text" defaultValue={cargo} placeholder="Cargo type (e.g. maize)"
          style={{ flex: 1, minWidth: 140, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }} />
        <button type="submit"
          style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Filter
        </button>
        {(district || cargo) && (
          <Link href="/transporter/job-queue"
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--d-border)', color: C.muted, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            Clear
          </Link>
        )}
      </form>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>🚛</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No open jobs</p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {district || cargo ? 'Try a different filter.' : 'Check back soon — new requests are posted daily.'}
          </p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {jobs.map((job: any, i: number) => {
            const bidStatus = bidMap.get(job.id);
            const hasBid    = !!bidStatus;
            return (
              <div key={job.id} style={{ padding: '16px 20px', borderBottom: i < jobs.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  🚛
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>
                    {job.pickup_district} → {job.dropoff_district}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>
                    {job.cargo_kg} kg {job.cargo_type ?? 'cargo'}
                    {job.pickup_location && ` · ${job.pickup_location}`}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    Pickup: {new Date(job.pickup_date).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  {job.notes && (
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>"{job.notes}"</p>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {hasBid ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                      background: bidStatus === 'accepted' ? '#D1FAE5' : bidStatus === 'rejected' ? '#FEF2F2' : '#FEF3C7',
                      color: bidStatus === 'accepted' ? '#059669' : bidStatus === 'rejected' ? '#DC2626' : '#D97706',
                    }}>
                      {bidStatus === 'accepted' ? '✓ Accepted' : bidStatus === 'rejected' ? 'Rejected' : 'Bid Sent'}
                    </span>
                  ) : (
                    <Link href={`/transporter/deliveries/${job.id}`}
                      style={{ display: 'block', padding: '7px 16px', background: vehicle ? C.green : '#F3F4F6', color: vehicle ? '#fff' : C.muted, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                      {vehicle ? 'Bid →' : 'View'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: C.muted }}>
        Showing {jobs.length} result{jobs.length !== 1 ? 's' : ''} ·{' '}
        <Link href="/transporter/deliveries" style={{ color: C.greenMed, textDecoration: 'none' }}>
          View my bids →
        </Link>
      </p>
    </div>
  );
}
