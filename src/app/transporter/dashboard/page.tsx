import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  Truck, Zap, Snowflake, Inbox, DollarSign, CreditCard, Car,
  CheckCircle2, X, Unlock, Navigation,
} from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)', purple: 'var(--color-purple)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('full_name, location, roles').eq('user_id', userId).single();
  return data as any;
});

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  open:       { color: C.green,  bg: 'var(--color-primary-bg)', label: 'Open',       icon: <Unlock size={10} /> },
  assigned:   { color: C.blue,   bg: 'var(--color-sky-bg)',     label: 'Assigned',   icon: <Car size={10} /> },
  in_transit: { color: C.amber,  bg: 'var(--color-harvest-bg)', label: 'In Transit', icon: <Navigation size={10} /> },
  delivered:  { color: C.purple, bg: 'var(--color-purple-bg)',  label: 'Delivered',  icon: <CheckCircle2 size={10} /> },
  cancelled:  { color: C.red,    bg: 'var(--color-danger-bg)',  label: 'Cancelled',  icon: <X size={10} /> },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  standard: <Truck size={16} />,
  fast:     <Zap size={16} />,
  cold:     <Snowflake size={16} />,
};

// ── Stats ─────────────────────────────────────────────────────────────────────

async function TransporterStats({ userId }: { userId: string }) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [activeRes, pendingRes, weekEarnRes, walletRes] = await Promise.all([
    (supabase.from as any)('delivery_requests')
      .select('id', { count: 'exact', head: true })
      .eq('transporter_id', userId)
      .in('status', ['assigned', 'in_transit']),
    (supabase.from as any)('driver_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', userId)
      .eq('status', 'pending'),
    (supabase.from as any)('delivery_requests')
      .select('driver_earnings')
      .eq('transporter_id', userId)
      .eq('status', 'delivered')
      .eq('payment_status', 'paid')
      .gte('delivered_at', weekAgo),
    (supabase.from as any)('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const weekEarnings = ((weekEarnRes.data ?? []) as any[]).reduce((s: number, d: any) => s + (d.driver_earnings ?? 0), 0);
  const balance = walletRes.data?.balance ?? 0;

  const stats = [
    { label: 'Active Jobs',      value: activeRes.count ?? 0,                           sub: 'Assigned & in transit',  icon: <Truck size={18} />,       border: C.green  },
    { label: 'New Requests',     value: pendingRes.count ?? 0,                          sub: 'Awaiting your response', icon: <Inbox size={18} />,       border: C.amber  },
    { label: 'Earned This Week', value: `UGX ${Math.round(weekEarnings).toLocaleString()}`, sub: 'Last 7 days — paid jobs', icon: <DollarSign size={18} />,   border: C.blue   },
    { label: 'Wallet Balance',   value: `UGX ${Math.round(balance).toLocaleString()}`,  sub: 'Available to withdraw',  icon: <CreditCard size={18} />,  border: C.purple },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '18px 20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <div style={{ color: border }}>{icon}</div>
          </div>
          <p className="text-2xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { label: 'Available Jobs', href: '/transporter/job-queue',  icon: <Inbox size={20} />,     bg: 'var(--color-primary-bg)', color: C.green  },
    { label: 'Active Jobs',    href: '/transporter/active',     icon: <Truck size={20} />,     bg: 'var(--color-sky-bg)',     color: C.blue   },
    { label: 'Earnings',       href: '/transporter/wallet',     icon: <DollarSign size={20} />, bg: 'var(--color-harvest-bg)', color: C.amber  },
    { label: 'My Vehicle',     href: '/transporter/vehicle',    icon: <Car size={20} />,       bg: 'var(--color-purple-bg)', color: C.purple },
    { label: 'Cool Transport', href: '/transporter/cold-chain', icon: <Snowflake size={20} />, bg: 'var(--color-danger-bg)',  color: C.red    },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Quick Actions</p>
      </div>
      <div className="grid grid-cols-5 gap-2 p-4">
        {actions.map(({ label, href, icon, bg, color }) => (
          <Link key={label} href={href} prefetch={true}
            className="flex flex-col items-center gap-2 py-4 rounded-xl hover:opacity-85 transition-opacity"
            style={{ background: bg, textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)', color }}>
              {icon}
            </div>
            <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color }}>{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Vehicle status card ───────────────────────────────────────────────────────

async function VehicleCard({ userId }: { userId: string }) {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: vehicle } = await (admin.from as any)('vehicles')
    .select('id, plate_number, vehicle_type, capacity_kg, is_available, is_cold_capable, make_model')
    .eq('user_id', userId)
    .maybeSingle();

  if (!vehicle) {
    return (
      <div style={{ background: 'var(--color-harvest-bg)', borderRadius: 14, border: '1px solid var(--color-warning-border)', padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
        <Car size={28} style={{ flexShrink: 0, color: C.amber }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: C.amber, fontWeight: 700, fontSize: 14, margin: '0 0 3px' }}>Register Your Vehicle to Start Earning</p>
          <p style={{ color: C.amber, fontSize: 12, margin: 0 }}>You need a registered vehicle to receive and accept delivery jobs.</p>
        </div>
        <Link href="/transporter/vehicle"
          style={{ padding: '8px 16px', background: C.amber, color: '#fff', borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
          Register →
        </Link>
      </div>
    );
  }

  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.green }}>
          <Truck size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>
              {vehicle.make_model ?? ''}{vehicle.make_model ? ' · ' : ''}{vehicle.plate_number}
            </p>
            {vehicle.is_cold_capable && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--color-sky-bg)', color: C.blue, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Snowflake size={10} /> Cool Transport
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            {vehicle.vehicle_type} · {vehicle.capacity_kg?.toLocaleString()} kg capacity
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
            background: vehicle.is_available ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: vehicle.is_available ? 'var(--color-success)' : C.red }}>
            {vehicle.is_available ? '● Available' : '● Busy'}
          </span>
          <Link href="/transporter/vehicle" style={{ fontSize: 11, color: C.greenMed, fontWeight: 600, textDecoration: 'none' }}>Edit vehicle</Link>
        </div>
      </div>
    </Card>
  );
}

// ── Open Jobs ─────────────────────────────────────────────────────────────────

async function OpenJobs({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: pending } = await (supabase.from as any)('driver_assignments')
    .select(`
      id, notified_at,
      delivery:delivery_requests(
        id, pickup_district, dropoff_district, cargo_kg, cargo_type,
        delivery_type, estimated_fare, driver_earnings, distance_km, pickup_date
      )
    `)
    .eq('driver_id', userId)
    .eq('status', 'pending')
    .order('notified_at', { ascending: false })
    .limit(5);

  const { data: openJobs } = await (supabase.from as any)('delivery_requests')
    .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, delivery_type, estimated_fare, driver_earnings, distance_km, pickup_date')
    .eq('status', 'open')
    .order('pickup_date', { ascending: true })
    .limit(8);

  const pendingRows = (pending ?? []) as any[];
  const openRows   = (openJobs ?? []) as any[];

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            {pendingRows.length > 0 ? `${pendingRows.length} Matched for You` : 'Available Jobs'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {pendingRows.length > 0 ? 'The system matched these jobs to your vehicle — respond now' : `${openRows.length} open jobs in your area`}
          </p>
        </div>
        <Link href="/transporter/job-queue" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>Job queue →</Link>
      </div>

      {pendingRows.length > 0 ? (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {pendingRows.map((a: any) => {
            const d = a.delivery;
            if (!d) return null;
            const typeIcon = TYPE_ICON[d.delivery_type ?? 'standard'] ?? TYPE_ICON.standard;
            return (
              <div key={a.id} className="px-5 py-4" style={{ background: 'var(--color-primary-bg)' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.5)', color: C.green }}>
                      {typeIcon}
                    </div>
                    <div>
                      <p className="text-sm font-black" style={{ color: C.text }}>{d.pickup_district} → {d.dropoff_district}</p>
                      <p className="text-xs" style={{ color: C.muted }}>
                        {d.cargo_kg} kg {d.cargo_type ?? ''} · {d.distance_km ? `${d.distance_km} km` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black" style={{ color: C.green, letterSpacing: '-0.02em' }}>
                      UGX {Math.round(d.driver_earnings ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[10px]" style={{ color: C.muted }}>your earnings</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/transporter/active"
                    style={{ flex: 1, padding: '8px', background: C.green, color: '#fff', borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                    Accept Job
                  </Link>
                  <Link href="/transporter/active"
                    style={{ padding: '8px 14px', background: 'var(--color-danger-bg)', color: C.red, borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    Decline
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : openRows.length > 0 ? (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {openRows.slice(0, 5).map((job: any) => {
            const typeIcon = TYPE_ICON[job.delivery_type ?? 'standard'] ?? TYPE_ICON.standard;
            return (
              <div key={job.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-primary-bg)', color: C.green }}>
                    {typeIcon}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: C.text }}>{job.pickup_district} → {job.dropoff_district}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>
                      {job.cargo_kg} kg · {job.distance_km ? `${job.distance_km} km · ` : ''}
                      {new Date(job.pickup_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: C.green }}>
                    UGX {Math.round(job.driver_earnings ?? 0).toLocaleString()}
                  </p>
                  <Link href="/transporter/job-queue" style={{ fontSize: 10, color: C.greenMed, fontWeight: 700, textDecoration: 'none' }}>View →</Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: C.green }} />
          <p className="text-sm font-medium" style={{ color: C.muted }}>No open jobs right now</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Check the job queue for new requests — new jobs post daily</p>
        </div>
      )}
    </Card>
  );
}

// ── Active deliveries ─────────────────────────────────────────────────────────

async function MyActiveJobs({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: deliveries } = await (supabase.from as any)('delivery_requests')
    .select('id, pickup_district, dropoff_district, cargo_kg, cargo_type, delivery_type, driver_earnings, status, accepted_at, picked_up_at')
    .eq('transporter_id', userId)
    .in('status', ['assigned', 'in_transit'])
    .order('accepted_at', { ascending: false });

  const rows = (deliveries ?? []) as any[];
  if (rows.length === 0) return null;

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>My Active Jobs</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>{rows.length} job{rows.length !== 1 ? 's' : ''} in progress</p>
        </div>
        <Link href="/transporter/active" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>Manage →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {rows.map((d: any) => {
          const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.assigned;
          const typeIcon = TYPE_ICON[d.delivery_type ?? 'standard'] ?? TYPE_ICON.standard;
          return (
            <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {typeIcon}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.text }}>{d.pickup_district} → {d.dropoff_district}</p>
                  <p className="text-[11px]" style={{ color: C.muted }}>{d.cargo_kg} kg {d.cargo_type ?? ''}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black" style={{ color: C.green }}>
                  UGX {Math.round(d.driver_earnings ?? 0).toLocaleString()}
                </p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {cfg.icon}{cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Earnings history ──────────────────────────────────────────────────────────

async function EarningsHistory({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: recent } = await (supabase.from as any)('delivery_requests')
    .select('id, pickup_district, dropoff_district, delivery_type, driver_earnings, payment_status, delivered_at')
    .eq('transporter_id', userId)
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false })
    .limit(5);

  const rows = (recent ?? []) as any[];
  if (rows.length === 0) return null;

  const paidTotal = rows.filter((d: any) => d.payment_status === 'paid').reduce((s: number, d: any) => s + (d.driver_earnings ?? 0), 0);

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Recent Earnings</p>
          <p className="text-xs mt-0.5" style={{ color: C.green, fontWeight: 700 }}>
            UGX {Math.round(paidTotal).toLocaleString()} received
          </p>
        </div>
        <Link href="/transporter/wallet" prefetch={true} className="text-xs font-semibold" style={{ color: C.greenMed }}>Full history →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {rows.map((d: any) => {
          const typeIcon = TYPE_ICON[d.delivery_type ?? 'standard'] ?? TYPE_ICON.standard;
          const paid = d.payment_status === 'paid';
          return (
            <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: paid ? 'var(--color-success-bg)' : 'var(--color-surface-2)', color: paid ? 'var(--color-success)' : C.muted }}>
                  {typeIcon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.text }}>
                    {d.pickup_district} → {d.dropoff_district}
                  </p>
                  <p className="text-[11px]" style={{ color: C.muted }}>
                    {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : ''}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black" style={{ color: C.text }}>
                  UGX {Math.round(d.driver_earnings ?? 0).toLocaleString()}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: paid ? 'var(--color-success-bg)' : 'var(--color-harvest-bg)',
                    color: paid ? 'var(--color-success)' : C.amber,
                  }}>
                  {paid ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TransporterDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userId = user.id;

  const profile = await getProfile(userId);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Driver';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            Good to go, {firstName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Driver Hub · {profile?.location ?? 'Uganda'}</p>
        </div>
        <Link href="/transporter/job-queue"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: C.green, textDecoration: 'none' }}>
          Find Jobs →
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
        </div>
      }>
        <TransporterStats userId={userId} />
      </Suspense>

      {/* Quick Actions */}
      <QuickActions />

      {/* Vehicle */}
      <Suspense fallback={<div className="dash-skeleton h-24 rounded-xl" />}>
        <VehicleCard userId={userId} />
      </Suspense>

      {/* Open Jobs + Active Jobs (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <OpenJobs userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <MyActiveJobs userId={userId} />
        </Suspense>
      </div>

      {/* Recent earnings */}
      <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
        <EarningsHistory userId={userId} />
      </Suspense>

    </div>
  );
}
