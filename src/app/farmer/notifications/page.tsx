import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const TYPE_ICON: Record<string, string> = {
  delivery: '🚛', price: '📈', offer: '🤝', loan: '💰', system: '⚙️',
  rain: '🌧️', pest: '🐛', disease: '🔬', payment: '💳',
};

export default async function FarmerNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // notifications.farmer_id references profiles.id, not auth.users.id
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) redirect('/auth/signin');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('farmer_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(60);

  const notifications = (data ?? []) as any[];
  const unread = notifications.filter(n => !n.read).length;

  // Mark all as read
  if (unread > 0) {
    await supabase.from('notifications').update({ read: true }).eq('farmer_id', profile.id).eq('read', false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Notifications
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {unread > 0 ? `${unread} unread` : `${notifications.length} total`}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔔</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>All clear</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Offer updates, weather alerts, and price changes will appear here.
          </p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {notifications.map((n: any, i: number) => {
            const icon = TYPE_ICON[n.type] ?? '🔔';
            return (
              <div key={n.id} style={{
                padding: '15px 20px', display: 'flex', gap: 13, alignItems: 'flex-start',
                borderBottom: i < notifications.length - 1 ? `1px solid ${C.border}` : 'none',
                background: n.read ? C.cardBg : 'var(--color-primary-bg)',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: C.text, margin: '0 0 2px' }}>
                    {n.title ?? n.message ?? 'Notification'}
                  </p>
                  {n.body && <p style={{ fontSize: 12, color: C.muted, margin: '0 0 3px', lineHeight: 1.4 }}>{n.body}</p>}
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    {new Date(n.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.read && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, marginTop: 5, flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
