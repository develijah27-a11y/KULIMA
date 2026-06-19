import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const PRIORITY_COLORS: Record<string, { c: string; bg: string }> = {
  high:   { c: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
  medium: { c: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  low:    { c: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
};

export default async function GroupChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [{ data: announcements }, { data: members }] = await Promise.all([
    (supabase.from as any)('group_announcements')
      .select('id, title, body, priority, created_at, emoji')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    (supabase.from as any)('group_members')
      .select('id, full_name, phone_number')
      .eq('admin_id', user.id)
      .limit(50),
  ]);

  const rows = (announcements ?? []) as any[];
  const memberList = (members ?? []) as any[];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Group Feed
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            {memberList.length > 0 ? `${memberList.length} members` : 'Group announcements and activity'}
          </p>
        </div>
        <Link href="/groups/announcements"
          style={{ padding: '9px 16px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + Announce
        </Link>
      </div>

      {/* Member roster */}
      {memberList.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Members</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{memberList.length} total</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 14 }}>
            {memberList.slice(0, 12).map((m: any, i: number) => (
              <div key={m.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: 'var(--color-primary-bg)' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>
                  {(m.full_name ?? '?')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{m.full_name?.split(' ')[0] ?? 'Member'}</span>
              </div>
            ))}
            {memberList.length > 12 && (
              <div style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 20, background: 'var(--color-surface-2)' }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>+{memberList.length - 12} more</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements feed */}
      {rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((a: any) => {
            const pc = PRIORITY_COLORS[a.priority ?? 'low'] ?? PRIORITY_COLORS.low;
            return (
              <div key={a.id} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{a.emoji ?? '📢'}</span>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{a.title}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0, marginLeft: 10 }}>
                    {a.priority && a.priority !== 'low' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: pc.bg, color: pc.c, textTransform: 'capitalize' }}>{a.priority}</span>
                    )}
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      {new Date(a.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>{a.body}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>💬</p>
          <p style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>No posts yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Start by posting an announcement to your group members.</p>
          <Link href="/groups/announcements"
            style={{ display: 'inline-block', padding: '10px 20px', background: C.green, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Post First Announcement
          </Link>
        </div>
      )}

      {/* Real-time chat coming soon */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>⚡</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 3px' }}>Real-Time Group Chat — Coming Soon</p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Live messaging with voice notes and photo sharing, directly in KULIMA — no separate WhatsApp group needed.</p>
        </div>
      </div>
    </div>
  );
}
