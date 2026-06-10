import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)', purple: '#7C3AED',
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

async function GroupStats({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [membersRes, listingsRes, walletRes, loansRes] = await Promise.all([
    (supabase.from as any)('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', userId)
      .eq('status', 'active')
      .catch(() => ({ count: 0 })),
    (supabase.from as any)('group_listings')
      .select('id', { count: 'exact', head: true })
      .eq('group_admin_id', userId)
      .eq('status', 'active')
      .catch(() => ({ count: 0 })),
    (supabase.from as any)('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle(),
    (supabase.from as any)('group_loans')
      .select('id', { count: 'exact', head: true })
      .eq('group_admin_id', userId)
      .eq('status', 'pending')
      .catch(() => ({ count: 0 })),
  ]);

  const stats = [
    { label: 'Group Members', value: membersRes.count ?? 0, icon: '👥', sub: 'Active members', border: C.greenBright },
    { label: 'Collective Listings', value: listingsRes.count ?? 0, icon: '📦', sub: 'Active on market', border: C.blue },
    { label: 'Group Balance', value: `UGX ${Math.round(walletRes?.data?.balance ?? 0).toLocaleString()}`, icon: '💵', sub: 'Pooled funds', border: C.amber },
    { label: 'Loan Applications', value: loansRes.count ?? 0, icon: '🏦', sub: 'Pending review', border: loansRes.count ? C.amber : C.muted },
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
    { label: 'Add Member', href: '/groups/members/add', emoji: '👤', bg: '#F0FDF4', color: C.green },
    { label: 'Group Listing', href: '/groups/listings/create', emoji: '📦', bg: '#EFF6FF', color: C.blue },
    { label: 'Record Payment', href: '/groups/finance', emoji: '💰', bg: '#FFFBEB', color: '#D97706' },
    { label: 'Apply for Loan', href: '/groups/loans', emoji: '🏦', bg: '#F5F3FF', color: C.purple },
    { label: 'Season Plan', href: '/groups/announcements', emoji: '📅', bg: '#FEF2F2', color: C.red },
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

// Season announcement / group achievement banner
async function SeasonBanner({ userId }: { userId: string }) {
  const supabase = await createClient();

  // Current Uganda season context
  const month = new Date().getMonth();
  const season = month >= 2 && month <= 4 ? 'Season A (Mar–May)' : month >= 8 && month <= 10 ? 'Season B (Sep–Nov)' : 'Off-season';
  const nextAction = month >= 2 && month <= 4
    ? 'Coordinate land preparation and group seed purchase for Season A'
    : month >= 8 && month <= 10
    ? 'Arrange collective harvest transport and bulk storage contracts'
    : 'Plan group input procurement for the upcoming planting season';

  const { data: announcement } = await (supabase.from as any)('group_announcements')
    .select('title, body, created_at')
    .eq('group_admin_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .catch(() => ({ data: null }));

  return (
    <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(82,183,136,0.2)' }}>
          📢
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary-muted)' }}>
            {announcement ? 'Latest Announcement' : `${season} · Group Action`}
          </p>
          <p className="text-sm font-bold text-white leading-snug">
            {announcement?.title ?? nextAction}
          </p>
          {announcement?.body && (
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{announcement.body}</p>
          )}
        </div>
        <Link href="/groups/announcements" className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0" style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)', textDecoration: 'none' }}>
          {announcement ? 'View →' : 'Post →'}
        </Link>
      </div>
    </div>
  );
}

// Group members list
async function MembersList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: members, error } = await (supabase.from as any)('group_members')
    .select('id, name, phone, village, primary_crop, acres, status, joined_at')
    .eq('admin_id', userId)
    .order('joined_at', { ascending: false })
    .limit(6);

  const rows = error ? [] : (members ?? []);

  const CROP_EMOJI: Record<string, string> = { maize: '🌽', coffee: '☕', beans: '🫘', banana: '🍌', cassava: '🥔', tomato: '🍅', rice: '🌾', cotton: '🌾' };

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d < 30) return `${d}d ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Group Members</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>{rows.length} shown · sorted by newest</p>
        </div>
        <Link href="/groups/members" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-sm font-bold" style={{ color: C.text }}>No members yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>Add farmers to your group to start collective farming activities</p>
          <Link href="/groups/members/add" className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
            Add First Member →
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((m: any) => (
            <div key={m.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ background: '#F0FDF4', color: C.green }}>
                  {m.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.text }}>{m.name}</p>
                  <p className="text-[11px]" style={{ color: C.muted }}>
                    {m.village ?? 'Unknown'} · {m.acres ?? '?'} ac · {CROP_EMOJI[m.primary_crop?.toLowerCase()] ?? '🌱'} {m.primary_crop ?? 'Mixed'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] shrink-0" style={{ color: C.muted }}>{timeAgo(m.joined_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Group collective listings
async function GroupListings({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: listings, error } = await (supabase.from as any)('group_listings')
    .select('id, crop_type, total_quantity_kg, asking_price, district, member_count, status, created_at')
    .eq('group_admin_id', userId)
    .order('created_at', { ascending: false })
    .limit(4);

  const rows = error ? [] : (listings ?? []);

  const CROP_EMOJI: Record<string, string> = { maize: '🌽', coffee: '☕', beans: '🫘', banana: '🍌', cassava: '🥔', tomato: '🍅', rice: '🌾', cotton: '🌾' };
  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    active:  { label: 'Active', color: '#059669', bg: '#D1FAE5' },
    pending: { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
    sold:    { label: 'Sold', color: '#0284C7', bg: 'var(--color-sky-bg)' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Collective Listings</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Pooled produce for bulk sale</p>
        </div>
        <Link href="/groups/listings" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-sm font-bold" style={{ color: C.text }}>No collective listings yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>Pool your members' produce to negotiate better prices with buyers</p>
          <Link href="/groups/listings/create" className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
            Create Group Listing →
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((l: any) => {
            const k = l.crop_type?.toLowerCase() ?? '';
            const st = STATUS[l.status] ?? STATUS.pending;
            return (
              <div key={l.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: '#F0FDF4' }}>
                    {CROP_EMOJI[k] ?? '🌾'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize" style={{ color: C.text }}>{l.crop_type}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>
                      {(l.total_quantity_kg ?? 0).toLocaleString()} kg · {l.member_count ?? 1} farmers · {l.district}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: C.text }}>UGX {Math.round(l.asking_price ?? 0).toLocaleString()}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Financial summary
async function FinancialSummary({ userId }: { userId: string }) {
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [contribRes, loanRes] = await Promise.all([
    (supabase.from as any)('group_contributions')
      .select('amount')
      .eq('admin_id', userId)
      .gte('contributed_at', weekAgo)
      .catch(() => ({ data: [] })),
    (supabase.from as any)('group_loans')
      .select('amount, status')
      .eq('group_admin_id', userId)
      .catch(() => ({ data: [] })),
  ]);

  const weeklyContrib = ((contribRes.data ?? []) as any[]).reduce((s: number, c: any) => s + (c.amount ?? 0), 0);
  const activeLoans = ((loanRes.data ?? []) as any[]).filter((l: any) => l.status === 'active');
  const loanTotal = activeLoans.reduce((s: number, l: any) => s + (l.amount ?? 0), 0);

  const items = [
    { label: 'Contributions this week', value: `UGX ${Math.round(weeklyContrib).toLocaleString()}`, icon: '💵', color: C.greenMed },
    { label: 'Active loans outstanding', value: `UGX ${Math.round(loanTotal).toLocaleString()}`, icon: '🏦', color: loanTotal > 0 ? C.amber : C.muted },
    { label: 'Loan applications pending', value: ((loanRes.data ?? []) as any[]).filter((l: any) => l.status === 'pending').length, icon: '📋', color: C.blue },
  ];

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Financial Summary</p>
        <Link href="/groups/finance" className="text-xs font-semibold" style={{ color: C.greenMed }}>Full report →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {items.map(({ label, value, icon, color }) => (
          <div key={label} className="px-5 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: '#F0FDF4' }}>{icon}</div>
              <p className="text-sm font-medium" style={{ color: C.text }}>{label}</p>
            </div>
            <p className="text-sm font-black shrink-0" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <Link href="/groups/finance/record" className="block w-full text-center py-2.5 rounded-xl text-sm font-bold" style={{ background: '#F0FDF4', color: C.greenMed, textDecoration: 'none' }}>
          + Record Contribution
        </Link>
      </div>
    </Card>
  );
}

// Getting started for new groups
function GroupSetupGuide() {
  const steps = [
    { icon: '👥', title: 'Add your first members', sub: 'Invite farmers in your community to join', href: '/groups/members/add' },
    { icon: '📦', title: 'Create a collective listing', sub: 'Pool produce to negotiate better buyer prices', href: '/groups/listings/create' },
    { icon: '💵', title: 'Set up group wallet', sub: 'Collect contributions from all members', href: '/groups/finance' },
    { icon: '🏦', title: 'Apply for group loan', sub: 'Access group credit for shared input purchases', href: '/groups/loans' },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Group Setup Guide</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Complete these to unlock the full power of group farming</p>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {steps.map(({ icon, title, sub, href }) => (
          <Link key={title} href={href} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors" style={{ textDecoration: 'none' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: '#F0FDF4' }}>{icon}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.text }}>{title}</p>
              <p className="text-xs" style={{ color: C.muted }}>{sub}</p>
            </div>
            <span style={{ color: C.muted }}>→</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default async function GroupsDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userId = user.id;
  const profile = await getProfile(userId);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Leader';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {firstName}'s Group 👥
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Farmer Group Hub · {profile?.location ?? 'Uganda'}</p>
        </div>
        <Link href="/groups/members/add" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
          + Add Member
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}</div>}>
        <GroupStats userId={userId} />
      </Suspense>

      {/* Quick Actions */}
      <QuickActions />

      {/* Season Banner */}
      <Suspense fallback={<div className="dash-skeleton h-24 rounded-xl" />}>
        <SeasonBanner userId={userId} />
      </Suspense>

      {/* Members + Listings (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <MembersList userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <GroupListings userId={userId} />
        </Suspense>
      </div>

      {/* Finance + Setup Guide (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-48 rounded-xl" />}>
          <FinancialSummary userId={userId} />
        </Suspense>
        <GroupSetupGuide />
      </div>

    </div>
  );
}
