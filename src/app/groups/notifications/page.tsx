import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Bell } from 'lucide-react';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)' };

export default async function GroupsNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) redirect('/auth/signin');

  const { data } = await supabase.from('notifications')
    .select('*')
    .eq('farmer_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as any[];
  const unread = notifications.filter((n: any) => !n.read).length;

  if (unread > 0) {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('farmer_id', profile.id)
      .eq('read', false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>Notifications</h1>
        <p style={{ fontSize: 13, color: C.muted }}>{unread > 0 ? `${unread} unread` : `${notifications.length} total`}</p>
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.shadow }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Bell size={48} style={{ color: C.muted }} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>All clear</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>No notifications right now.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
          {notifications.map((n: any, i: number) => (
            <div key={n.id} style={{
              padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start',
              borderBottom: i < notifications.length - 1 ? `1px solid ${C.border}` : 'none',
              background: n.read ? C.cardBg : 'var(--color-primary-bg)',
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
