import { redirect } from 'next/navigation';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', green: '#1B4332', greenMed: '#40916C', shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)' };

export default async function NotificationsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  const supabase = await getSupabase();
  const { data } = await supabase.from('notifications')
    .select('*')
    .eq('farmer_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = data ?? [];

  // mark all as read
  await supabase.from('notifications')
    .update({ read: true })
    .eq('farmer_id', session.user.id)
    .eq('read', false);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>Notifications</h1>
        <p style={{ fontSize: 13, color: C.muted }}>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.shadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔔</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>All clear</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>You have no notifications right now.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
          {notifications.map((n: any, i: number) => (
            <div key={n.id} style={{
              padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start',
              borderBottom: i < notifications.length - 1 ? `1px solid ${C.border}` : 'none',
              background: n.read ? C.cardBg : '#F0FDF4',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : C.greenMed, marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: n.read ? 400 : 700, color: C.text, marginBottom: 2 }}>
                  {n.message ?? n.title ?? 'Notification'}
                </p>
                <p style={{ fontSize: 12, color: C.muted }}>
                  {new Date(n.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
