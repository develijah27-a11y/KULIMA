import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const SAMPLE_ANNOUNCEMENTS = [
  { emoji: '📅', title: 'Group Meeting', body: 'Monthly planning meeting this Saturday at Kiboga Community Hall, 10am. All members must attend.', date: 'Jun 14', priority: 'high' },
  { emoji: '🌾', title: 'Harvest Collection', body: 'Maize harvest collection starts June 20. Bring 50 kg bags. Weighing point at Okello store.', date: 'Jun 12', priority: 'medium' },
  { emoji: '💰', title: 'Bulk Order Payment Due', body: 'June fertiliser order payment of UGX 30,000 per member is due by June 18. Pay to treasurer.', date: 'Jun 10', priority: 'high' },
  { emoji: '🌱', title: 'New Seed Variety Available', body: 'NASECO hybrid maize seed now available via our bulk order. Contact the secretary to add your order.', date: 'Jun 8', priority: 'low' },
];

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: announcements } = await (supabase.from as any)('group_announcements')
    .select('id, title, body, priority, created_at, emoji')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
    .catch(() => ({ data: [] }));

  const rows = (announcements ?? []) as any[];
  const displayRows = rows.length > 0 ? rows : SAMPLE_ANNOUNCEMENTS;
  const isEmpty = rows.length === 0;

  const PRIORITY_COLORS: Record<string, { c: string; bg: string }> = {
    high:   { c: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
    medium: { c: C.amber,               bg: 'var(--color-harvest-bg)' },
    low:    { c: C.greenMed,            bg: 'var(--color-primary-bg)' },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Announcements 📢</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Important updates for all group members</p>
      </div>

      {isEmpty && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--color-harvest-bg)', fontSize: 12, color: C.amber, fontWeight: 600 }}>
          📋 No announcements yet — showing sample content. Create real announcements from Group Settings.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayRows.map((a: any, i: number) => {
          const pc = PRIORITY_COLORS[a.priority ?? 'low'] ?? PRIORITY_COLORS.low;
          const date = a.created_at ? new Date(a.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : a.date;
          return (
            <div key={a.id ?? i} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px 20px', opacity: isEmpty ? 0.75 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{a.emoji ?? '📢'}</span>
                  <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>{a.title}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                  {a.priority && a.priority !== 'low' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: pc.bg, color: pc.c, textTransform: 'capitalize' }}>{a.priority}</span>
                  )}
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{date}</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>{a.body}</p>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '14px 18px', borderRadius: 12, background: C.cardBg, boxShadow: C.cardShadow }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>📱 SMS Broadcast Coming Soon</p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Send announcements directly as SMS to all group members who don't have smartphones.</p>
      </div>
    </div>
  );
}
