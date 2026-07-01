import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClipboardList, Truck, CheckCircle2, AlertTriangle, CreditCard, Banknote } from 'lucide-react';

const C = {
  text:        'var(--d-text)',
  muted:       'var(--d-muted)',
  border:      'var(--d-border)',
  cardBg:      'var(--d-card)',
  cardShadow:  'var(--d-shadow-card)',
  green:       'var(--color-primary)',
  greenMed:    'var(--color-primary-hover)',
  greenBright: 'var(--color-primary-muted)',
  amber:       'var(--color-harvest)',
  red:         'var(--color-danger)',
  blue:        'var(--color-sky)',
  violet:      '#7C3AED',
} as const;

const STATUS_CFG = {
  open:       { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)',     label: 'Open'       },
  assigned:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Assigned'   },
  in_transit: { color: '#7C3AED',              bg: '#EDE9FE',                  label: 'In Transit' },
  delivered:  { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Delivered'  },
  cancelled:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Cancelled'  },
} as const;

const TYPE_CFG = {
  standard: { color: 'var(--d-muted)',        bg: 'var(--color-surface-2)',  label: 'Standard' },
  fast:     { color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)', label: 'Fast'     },
  cold:     { color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)',     label: 'Cold'     },
} as const;

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1000)}K`;
  return Math.round(n).toLocaleString();
}

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
async function DeliveryKPIs() {
  const supabase = await createClient();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const [openRes, activeRes, deliveredTodayRes, pendingPayRes, commissionRes] = await Promise.allSettled([
    (supabase.from as any)('delivery_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    (supabase.from as any)('delivery_requests').select('id', { count: 'exact', head: true }).in('status', ['assigned', 'in_transit']),
    (supabase.from as any)('delivery_requests').select('id', { count: 'exact', head: true }).eq('status', 'delivered').gte('delivered_at', todayStart.toISOString()),
    (supabase.from as any)('delivery_requests').select('id', { count: 'exact', head: true }).eq('status', 'delivered').eq('payment_status', 'pending'),
    (supabase.from as any)('delivery_requests').select('commission_amount').eq('payment_status', 'paid'),
  ]);

  const openCount       = openRes.status       === 'fulfilled' ? (openRes.value.count       ?? 0) : 0;
  const activeCount     = activeRes.status     === 'fulfilled' ? (activeRes.value.count     ?? 0) : 0;
  const deliveredToday  = deliveredTodayRes.status === 'fulfilled' ? (deliveredTodayRes.value.count ?? 0) : 0;
  const pendingPayCount = pendingPayRes.status === 'fulfilled' ? (pendingPayRes.value.count ?? 0) : 0;
  const commission      = commissionRes.status === 'fulfilled'
    ? ((commissionRes.value.data ?? []) as any[]).reduce((s, r) => s + (r.commission_amount ?? 0), 0)
    : 0;

  const kpis = [
    { label: 'Open Requests',   value: openCount.toString(),      sub: 'Awaiting a driver',      icon: <ClipboardList size={14} />, border: C.blue,        color: C.blue    },
    { label: 'Active',          value: activeCount.toString(),     sub: 'Assigned or in transit', icon: <Truck size={14} />,         border: C.violet,      color: C.violet  },
    { label: 'Delivered Today', value: deliveredToday.toString(),  sub: 'Completed today',        icon: <CheckCircle2 size={14} />,  border: C.greenMed,   color: C.greenMed },
    { label: 'Pending Payment', value: pendingPayCount.toString(), sub: 'Awaiting buyer payment', icon: pendingPayCount ? <AlertTriangle size={14} /> : <CreditCard size={14} />,
      border: pendingPayCount ? C.red : C.amber, color: pendingPayCount ? C.red : C.amber, alert: pendingPayCount > 3 },
    { label: 'Commission Paid', value: commission > 0 ? `UGX ${fmt(commission)}` : '—', sub: 'Platform revenue collected', icon: <Banknote size={14} />,
      border: C.greenBright, color: C.greenMed },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map(({ label, value, sub, icon, border, color, alert }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '16px 14px', position: 'relative' }}>
          {alert && <div style={{ position: 'absolute', top: 10, right: 10, width: 7, height: 7, borderRadius: '50%', background: C.red, boxShadow: `0 0 0 3px rgba(220,38,38,0.18)` }} />}
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{label}</p>
            <span style={{ display: 'flex', color }}>{icon}</span>
          </div>
          <p className="text-xl font-black" style={{ color, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-[10px] mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Delivery type breakdown ───────────────────────────────────────────────────
async function TypeBreakdown() {
  const supabase = await createClient();
  const { data } = await (supabase.from as any)('delivery_requests')
    .select('delivery_type')
    .not('status', 'eq', 'cancelled');

  const types: Record<string, number> = { standard: 0, fast: 0, cold: 0 };
  (data ?? []).forEach((r: any) => {
    const t = r.delivery_type ?? 'standard';
    types[t] = (types[t] ?? 0) + 1;
  });
  const total = Object.values(types).reduce((s, v) => s + v, 0) || 1;

  return (
    <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text }}>Delivery Types</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>All active deliveries by service tier</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {(Object.entries(TYPE_CFG) as [keyof typeof TYPE_CFG, typeof TYPE_CFG[keyof typeof TYPE_CFG]][]).map(([type, cfg]) => {
          const count = types[type] ?? 0;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={type}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-xs" style={{ color: C.muted }}>{count} ({pct}%)</span>
              </div>
              <div style={{ height: 5, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                <div style={{ height: 5, width: `${pct}%`, background: cfg.color, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Top routes ───────────────────────────────────────────────────────────────
async function TopRoutes() {
  const supabase = await createClient();
  const { data } = await (supabase.from as any)('delivery_requests')
    .select('pickup_district, dropoff_district')
    .not('status', 'eq', 'cancelled')
    .limit(200);

  const routes: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    if (r.pickup_district && r.dropoff_district) {
      const key = `${r.pickup_district} → ${r.dropoff_district}`;
      routes[key] = (routes[key] ?? 0) + 1;
    }
  });

  const sorted = Object.entries(routes).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text }}>Top Routes</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Most requested pickup → dropoff pairs</p>
      </div>
      {sorted.length === 0 ? (
        <div className="px-5 py-8 text-center"><p className="text-sm" style={{ color: C.muted }}>No route data yet</p></div>
      ) : (
        <div className="px-5 py-4 space-y-2.5">
          {sorted.map(([route, count], i) => (
            <div key={route}>
              <div className="flex justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black" style={{ color: C.muted }}>#{i + 1}</span>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>{route}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: C.greenMed }}>{count}</span>
              </div>
              <div style={{ height: 4, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                <div style={{ height: 4, width: `${Math.round((count / max) * 100)}%`, background: `linear-gradient(90deg, ${C.greenMed}, ${C.greenBright})`, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Deliveries list ──────────────────────────────────────────────────────────
async function DeliveriesList({ status }: { status: string }) {
  const supabase = await createClient();

  let q = (supabase.from as any)('delivery_requests')
    .select('id, status, delivery_type, cargo_kg, cargo_type, pickup_district, dropoff_district, estimated_fare, distance_km, commission_amount, driver_earnings, payment_status, created_at, delivered_at, requester_id, transporter_id')
    .order('created_at', { ascending: false })
    .limit(60);

  if (status) q = q.eq('status', status);

  const { data: deliveries } = await q;
  const rows = (deliveries ?? []) as any[];

  // Two-step join: fetch profile names for all referenced user IDs
  const userIds = [...new Set(
    [...rows.map((r: any) => r.requester_id), ...rows.map((r: any) => r.transporter_id)].filter(Boolean) as string[]
  )];

  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await (supabase.from as any)('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.full_name ?? 'Unknown'; });
  }

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Truck size={40} style={{ color: C.muted }} /></div>
        <p className="text-sm font-semibold" style={{ color: C.text }}>
          {status ? `No ${STATUS_CFG[status as keyof typeof STATUS_CFG]?.label ?? status} deliveries` : 'No deliveries yet'}
        </p>
        <p className="text-xs mt-1" style={{ color: C.muted }}>Delivery requests will appear here as they are created.</p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: C.border }}>
      {rows.map((d: any) => {
        const st  = STATUS_CFG[d.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.open;
        const typ = TYPE_CFG[d.delivery_type as keyof typeof TYPE_CFG]  ?? TYPE_CFG.standard;
        const requesterName   = nameMap[d.requester_id]  ?? '—';
        const transporterName = nameMap[d.transporter_id] ?? null;
        const payColor        = d.payment_status === 'paid' ? C.greenMed : d.payment_status === 'failed' ? C.red : C.amber;

        return (
          <div key={d.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">

              {/* Left: route + cargo + participants */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm font-black" style={{ color: C.text }}>{d.pickup_district}</span>
                  <span style={{ color: C.muted, fontSize: 11, margin: '0 1px' }}>→</span>
                  <span className="text-sm font-black" style={{ color: C.text }}>{d.dropoff_district}</span>
                  {d.distance_km != null && (
                    <span className="text-[10px] ml-1" style={{ color: C.muted }}>{d.distance_km} km</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: typ.bg, color: typ.color }}>
                    {typ.label}
                  </span>
                  <span className="text-[10px]" style={{ color: C.muted }}>
                    {d.cargo_kg} kg{d.cargo_type ? ` · ${d.cargo_type}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px]" style={{ color: C.muted }}>📦 {requesterName}</span>
                  {transporterName
                    ? <span className="text-[10px]" style={{ color: C.muted }}>🚗 {transporterName}</span>
                    : <span className="text-[10px]" style={{ color: C.amber }}>No driver yet</span>
                  }
                </div>
              </div>

              {/* Right: fare + commission + payment status */}
              <div className="text-right shrink-0">
                {d.estimated_fare != null ? (
                  <>
                    <p className="text-sm font-black" style={{ color: C.text }}>
                      UGX {Math.round(d.estimated_fare).toLocaleString()}
                    </p>
                    {d.commission_amount != null && (
                      <p className="text-[10px]" style={{ color: C.greenMed }}>
                        fee {Math.round(d.commission_amount).toLocaleString()}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs" style={{ color: C.muted }}>No fare</p>
                )}
                <div className="mt-1">
                  <span className="text-[9px] font-bold capitalize" style={{ color: payColor }}>
                    {d.payment_status ?? 'pending'}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{timeAgo(d.created_at)}</p>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AdminDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  const { status = '' } = await searchParams;
  const statusTabs = ['', 'open', 'assigned', 'in_transit', 'delivered', 'cancelled'];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ color: 'var(--d-text)', letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Delivery Management
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--d-muted)' }}>
          Uber-style delivery tracking · driver assignments · commission overview
        </p>
      </div>

      {/* KPIs */}
      <Suspense fallback={
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="dash-skeleton h-20 rounded-xl" />)}
        </div>
      }>
        <DeliveryKPIs />
      </Suspense>

      {/* Type breakdown + Top routes */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-40 rounded-xl" />}>
          <TypeBreakdown />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-40 rounded-xl" />}>
          <TopRoutes />
        </Suspense>
      </div>

      {/* Deliveries list with status filter */}
      <div style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)' }}>
        <div className="px-5 py-3 flex flex-wrap gap-2" style={{ borderBottom: '1px solid var(--d-border)' }}>
          {statusTabs.map(s => {
            const cfg = s ? STATUS_CFG[s as keyof typeof STATUS_CFG] : null;
            const selected = status === s;
            return (
              <a
                key={s || 'all'}
                href={s ? `/admin/deliveries?status=${s}` : '/admin/deliveries'}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  textDecoration: 'none',
                  background: selected ? (cfg?.bg ?? 'var(--color-primary)') : 'var(--color-surface-2)',
                  color:      selected ? (cfg?.color ?? '#fff')             : 'var(--d-muted)',
                }}
              >
                {s ? (cfg?.label ?? s) : 'All'}
              </a>
            );
          })}
        </div>

        <Suspense fallback={<div className="px-5 py-10"><div className="dash-skeleton h-48 rounded-xl" /></div>}>
          <DeliveriesList status={status} />
        </Suspense>
      </div>

    </div>
  );
}
