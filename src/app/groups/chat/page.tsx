import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const FEATURES = [
  { icon: '💬', title: 'Group Channel', desc: 'A single group chat where all members can discuss, coordinate, and share updates.' },
  { icon: '📸', title: 'Photo Sharing', desc: 'Share field photos, disease symptoms, and delivery confirmations directly in chat.' },
  { icon: '📢', title: 'Announcements', desc: 'Pin important messages — meetings, delivery dates, price updates — to the top.' },
  { icon: '📞', title: 'Voice Notes', desc: 'Send voice messages for members who find typing difficult.' },
];

export default async function GroupChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: members } = await (supabase.from as any)('group_members')
    .select('full_name')
    .eq('admin_id', user.id)
    .limit(5);

  const memberCount = (members ?? []).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Group Chat 💬</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Real-time messaging for all {memberCount > 0 ? `${memberCount}+ ` : ''}group members</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>💬</div>
        <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>Group Chat Coming Soon</p>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          We're building a real-time group chat so you can coordinate with all members directly in KULIMA — no need for separate WhatsApp groups.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--d-bg)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: C.muted }}>Members will be notified when group chat goes live.</p>
      </div>
    </div>
  );
}
