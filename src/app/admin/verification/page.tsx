import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { BADGE_CONFIG, type VerificationLevel } from '@/lib/trust';
import { ApproveRejectButtons } from './ApproveRejectButtons';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: '#1B4332',
};

const STATUS_CFG = {
  pending:  { color: '#D97706', bg: '#FEF3C7', label: 'Pending' },
  approved: { color: '#059669', bg: '#D1FAE5', label: 'Approved' },
  rejected: { color: '#DC2626', bg: '#FEF2F2', label: 'Rejected' },
};

async function VerificationQueue({ filter }: { filter: string }) {
  const supabase = await createClient();
  let q = (supabase.from as any)('verifications')
    .select('id, level, status, role, submitted_at, reviewed_at, rejection_reason, profile:profiles(full_name, phone_number, location)')
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (filter !== 'all') q = q.eq('status', filter);
  const { data: rows } = await q;

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  }

  if (!rows?.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-sm font-medium" style={{ color: C.muted }}>No {filter !== 'all' ? filter : ''} verifications found</p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: C.border }}>
      {rows.map((v: any) => {
        const badge = BADGE_CONFIG[v.level as VerificationLevel];
        const status = STATUS_CFG[v.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
        const profile = v.profile ?? {};
        return (
          <div key={v.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-sm font-bold" style={{ color: C.text }}>{profile.full_name ?? 'Unknown'}</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                  {badge.label} request
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: status.bg, color: status.color }}>
                  {status.label}
                </span>
              </div>
              <p className="text-xs" style={{ color: C.muted }}>
                {profile.phone_number ?? '—'} · {profile.location ?? '—'} · {v.role} · submitted {timeAgo(v.submitted_at)}
              </p>
              {v.rejection_reason && (
                <p className="text-xs mt-1" style={{ color: '#DC2626' }}>Rejected: {v.rejection_reason}</p>
              )}
            </div>
            {v.status === 'pending' && (
              <ApproveRejectButtons verificationId={v.id} userId={v.user_id} targetLevel={v.level} />
            )}
          </div>
        );
      })}
    </div>
  );
}

async function QueueStats() {
  const supabase = await createClient();
  const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
    (supabase.from as any)('verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    (supabase.from as any)('verifications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    (supabase.from as any)('verifications').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);
  const stats = [
    { label: 'Pending Review', value: pendingRes.count ?? 0, color: '#D97706', bg: '#FEF3C7' },
    { label: 'Approved',       value: approvedRes.count ?? 0, color: '#059669', bg: '#D1FAE5' },
    { label: 'Rejected',       value: rejectedRes.count ?? 0, color: '#DC2626', bg: '#FEF2F2' },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(s => (
        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px' }}>
          <p className="text-2xl font-black" style={{ color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
          <p className="text-xs font-semibold mt-1" style={{ color: s.color }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const { data: profile } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  const { filter = 'pending' } = await searchParams;
  const filters = ['pending', 'approved', 'rejected', 'all'];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          KYC Verification Queue
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Review and approve user identity documents.</p>
      </div>

      <Suspense fallback={<div className="dash-skeleton h-20 rounded-xl" />}>
        <QueueStats />
      </Suspense>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div className="px-5 py-4 flex flex-wrap items-center gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
          {filters.map(f => (
            <a
              key={f}
              href={`/admin/verification?filter=${f}`}
              style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                textDecoration: 'none', textTransform: 'capitalize',
                background: filter === f ? C.green : '#F3F4F6',
                color: filter === f ? '#fff' : C.muted,
              }}
            >
              {f}
            </a>
          ))}
        </div>
        <Suspense fallback={<div className="px-5 py-10 text-center"><div className="dash-skeleton h-48 rounded-xl" /></div>}>
          <VerificationQueue filter={filter} />
        </Suspense>
      </div>
    </div>
  );
}
