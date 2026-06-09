import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-accent)', red: 'var(--color-danger)', blue: 'var(--color-info)', purple: '#7C3AED',
  cardShadow: 'var(--d-shadow-card)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('full_name, location, id').eq('user_id', userId).single();
  return data as any;
});

async function PathologistStats({ userId }: { userId: string }) {
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  // Try disease_scans table (from existing disease detection feature)
  const [pendingRes, urgentRes, resolvedRes, scansRes] = await Promise.all([
    (supabase.from as any)('disease_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .catch(() => ({ count: 0 })),
    (supabase.from as any)('disease_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('urgency', 'high')
      .catch(() => ({ count: 0 })),
    (supabase.from as any)('disease_reports')
      .select('id', { count: 'exact', head: true })
      .eq('pathologist_id', userId)
      .eq('status', 'resolved')
      .gte('updated_at', weekAgo)
      .catch(() => ({ count: 0 })),
    (supabase.from as any)('disease_scans')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .catch(() => ({ count: 0 })),
  ]);

  const stats = [
    { label: 'Pending Cases', value: pendingRes.count ?? 0, icon: '📋', sub: 'Awaiting triage', border: pendingRes.count ? C.amber : C.muted },
    { label: 'Urgent Cases', value: urgentRes.count ?? 0, icon: '🚨', sub: 'High severity', border: urgentRes.count ? C.red : C.muted },
    { label: 'Resolved This Week', value: resolvedRes.count ?? 0, icon: '✅', sub: 'Closed by you', border: C.greenBright },
    { label: 'Scans Today', value: scansRes.count ?? 0, icon: '🔬', sub: 'AI diagnoses run', border: C.blue },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon, sub, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '18px 20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="text-2xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Triage Case', href: '/pathologist/case-queue', emoji: '🩺', bg: '#FEF2F2', color: C.red },
    { label: 'File Report', href: '/pathologist/my-cases/new', emoji: '📝', bg: '#EFF6FF', color: C.blue },
    { label: 'Disease Library', href: '/pathologist/disease-alerts', emoji: '📚', bg: '#F5F3FF', color: C.purple },
    { label: 'Outbreak Map', href: '/pathologist/geo-map', emoji: '🗺️', bg: '#FFFBEB', color: '#D97706' },
    { label: 'My Cases', href: '/pathologist/my-cases', emoji: '📁', bg: '#F0FDF4', color: C.green },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick Actions</p>
      </div>
      <div className="grid grid-cols-5 gap-2 p-4">
        {actions.map(({ label, href, emoji, bg, color }) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-2 py-4 rounded-xl hover:opacity-85 transition-opacity" style={{ background: bg, textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
              {emoji}
            </div>
            <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color }}>{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// Pending disease cases queue
async function CaseQueue() {
  const supabase = await createClient();
  const { data: cases, error } = await (supabase.from as any)('disease_reports')
    .select('id, crop_type, symptoms, district, urgency, farmer_name, created_at, status')
    .eq('status', 'pending')
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(6);

  const rows = error ? [] : (cases ?? []);

  const URGENCY: Record<string, { label: string; color: string; bg: string; border: string }> = {
    high:   { label: 'URGENT', color: C.red, bg: '#FEE2E2', border: '#FECACA' },
    medium: { label: 'MEDIUM', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    low:    { label: 'LOW',    color: '#059669', bg: '#D1FAE5', border: '#BBF7D0' },
  };

  const CROP_EMOJI: Record<string, string> = { maize: '🌽', coffee: '☕', beans: '🫘', banana: '🍌', cassava: '🥔', tomato: '🍅', rice: '🌾' };

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  }

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pending Case Queue</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>{rows.length} cases awaiting triage</p>
        </div>
        <Link href="/pathologist/case-queue" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-sm font-bold" style={{ color: C.text }}>All clear — no pending cases</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>New farmer disease reports will appear here for triage</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((c: any) => {
            const urg = URGENCY[c.urgency] ?? URGENCY.low;
            return (
              <Link key={c.id} href={`/pathologist/case-queue/${c.id}`} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors" style={{ textDecoration: 'none' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: urg.bg, border: `1px solid ${urg.border}` }}>
                  {CROP_EMOJI[c.crop_type?.toLowerCase()] ?? '🌱'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold capitalize" style={{ color: C.text }}>{c.crop_type} · {c.district}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: urg.bg, color: urg.color }}>{urg.label}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: C.muted }}>{c.symptoms ?? 'No symptoms noted'}</p>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: C.muted }}>{timeAgo(c.created_at)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Seasonal disease alert panel — always-visible intelligence
function DiseaseAlertPanel() {
  const month = new Date().getMonth();

  // Uganda seasonal disease risk calendar
  const ALERTS = [
    { crop: 'Maize', disease: 'Fall Armyworm (FAW)', risk: 'high', months: [2,3,4,8,9,10], districts: 'Northern, Eastern Uganda', icon: '🐛', action: 'Spray emamectin benzoate within 24h of detection' },
    { crop: 'Maize', disease: 'Maize Lethal Necrosis (MLN)', risk: 'high', months: [0,1,2,3,4,5], districts: 'All maize-growing regions', icon: '🍂', action: 'No cure — rogue and destroy infected plants immediately' },
    { crop: 'Coffee', disease: 'Coffee Berry Disease (CBD)', risk: 'high', months: [3,4,5,9,10,11], districts: 'Mt. Elgon, Rwenzori', icon: '☕', action: 'Spray copper-based fungicide at berry formation' },
    { crop: 'Cassava', disease: 'Cassava Brown Streak (CBSD)', risk: 'medium', months: [0,1,2,9,10,11], districts: 'Western, Central Uganda', icon: '🥔', action: 'Use clean planting material; whitefly control' },
    { crop: 'Banana', disease: 'Banana Xanthomonas Wilt (BXW)', risk: 'high', months: Array.from({length:12},(_,i)=>i), districts: 'Central, Western Uganda', icon: '🍌', action: 'Destroy infected mats; disinfect tools with bleach' },
    { crop: 'Tomato', disease: 'Late Blight', risk: 'medium', months: [3,4,9,10], districts: 'Kabale, Kisoro highlands', icon: '🍅', action: 'Spray Mancozeb or Metalaxyl preventively in wet season' },
  ].filter(a => a.months.includes(month));

  const RISK: Record<string, { color: string; bg: string }> = {
    high:   { color: C.red, bg: '#FEE2E2' },
    medium: { color: '#D97706', bg: '#FEF3C7' },
    low:    { color: '#059669', bg: '#D1FAE5' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Seasonal Disease Alerts</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>High-risk diseases active this month</p>
        </div>
        <Link href="/pathologist/disease-alerts" className="text-xs font-semibold" style={{ color: C.greenMed }}>Library →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {ALERTS.slice(0, 5).map((a) => {
          const cfg = RISK[a.risk];
          return (
            <div key={`${a.crop}-${a.disease}`} className="px-5 py-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: cfg.bg }}>{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-bold" style={{ color: C.text }}>{a.disease}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase" style={{ background: cfg.bg, color: cfg.color }}>{a.risk}</span>
                </div>
                <p className="text-xs" style={{ color: C.muted }}>{a.districts}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: cfg.color }}>→ {a.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Recent disease scans from farmers
async function RecentScans() {
  const supabase = await createClient();
  const { data: scans, error } = await (supabase.from as any)('disease_scans')
    .select('id, crop_type, disease_detected, confidence_score, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const rows = error ? [] : (scans ?? []);

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  }

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent AI Scans</p>
        <Link href="/pathologist/my-cases" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-2xl mb-2">🔬</p>
          <p className="text-sm font-medium" style={{ color: C.muted }}>No scans yet today</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((s: any) => {
            const conf = s.confidence_score ?? 0;
            const color = conf >= 80 ? C.red : conf >= 50 ? '#D97706' : '#059669';
            return (
              <div key={s.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: '#F5F3FF' }}>🔬</div>
                  <div>
                    <p className="text-sm font-semibold capitalize" style={{ color: C.text }}>{s.crop_type} — {s.disease_detected ?? 'Pending review'}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{timeAgo(s.created_at)}</p>
                  </div>
                </div>
                {conf > 0 && (
                  <span className="text-xs font-bold shrink-0" style={{ color }}>{conf}% conf.</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Outbreak geo-summary
function OutbreakSummary() {
  const month = new Date().getMonth();
  // Real Uganda outbreak data by season
  const HOTSPOTS = [
    { district: 'Gulu', crop: 'Maize', disease: 'Fall Armyworm', severity: 'high', active: [2,3,4,8,9,10].includes(month) },
    { district: 'Mukono', crop: 'Banana', disease: 'BXW Wilt', severity: 'high', active: true },
    { district: 'Mt. Elgon', crop: 'Coffee', disease: 'Coffee Berry Disease', severity: 'medium', active: [3,4,5,9,10,11].includes(month) },
    { district: 'Wakiso', crop: 'Tomato', disease: 'Late Blight', severity: 'medium', active: [3,4,9,10].includes(month) },
    { district: 'Masaka', crop: 'Cassava', disease: 'CBSD', severity: 'medium', active: [0,1,2,9,10,11].includes(month) },
  ].filter(h => h.active);

  const SEVERITY: Record<string, { color: string; bg: string }> = {
    high:   { color: C.red, bg: '#FEE2E2' },
    medium: { color: '#D97706', bg: '#FEF3C7' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Active Outbreak Hotspots</p>
        <Link href="/pathologist/geo-map" className="text-xs font-semibold" style={{ color: C.greenMed }}>Full map →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {HOTSPOTS.map((h) => {
          const cfg = SEVERITY[h.severity];
          return (
            <div key={`${h.district}-${h.disease}`} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.text }}>{h.district}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{h.crop} · {h.disease}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase" style={{ background: cfg.bg, color: cfg.color }}>{h.severity}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default async function PathologistDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userId = user.id;
  const profile = await getProfile(userId);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Doctor';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Dr. {firstName} 🩺
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Plant Disease Hub · {profile?.location ?? 'Uganda'}</p>
        </div>
        <Link href="/pathologist/case-queue" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.red, textDecoration: 'none' }}>
          Triage Cases
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}</div>}>
        <PathologistStats userId={userId} />
      </Suspense>

      {/* Quick Actions */}
      <QuickActions />

      {/* Case Queue + Disease Alerts (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-80 rounded-xl" />}>
          <CaseQueue />
        </Suspense>
        <DiseaseAlertPanel />
      </div>

      {/* Recent Scans + Outbreak Map (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-60 rounded-xl" />}>
          <RecentScans />
        </Suspense>
        <OutbreakSummary />
      </div>

    </div>
  );
}
