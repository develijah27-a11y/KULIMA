import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  blue: 'var(--color-sky)',
};

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [{ data: contracts }, { data: profile }] = await Promise.all([
    (supabase.from as any)('offtaker_contracts')
      .select(`
        id, crop_type, status, farmer_id,
        farmer:profiles!offtaker_contracts_farmer_id_fkey(full_name, phone_number, location)
      `)
      .eq('offtaker_id', user.id)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('profiles').select('id').eq('user_id', user.id).single(),
  ]);

  const { data: recentNotifs } = profile ? await supabase
    .from('notifications')
    .select('*')
    .eq('farmer_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10) : { data: [] };

  const rows = (contracts ?? []) as any[];
  const notifs = (recentNotifs ?? []) as any[];
  const uniqueFarmers = Array.from(new Map(rows.map(c => [c.farmer_id, c.farmer])).entries()).slice(0, 8);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Messages</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Your farmer contacts and system activity</p>
      </div>

      {/* Farmer contacts from contracts */}
      {uniqueFarmers.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Farmer Contacts</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>From your active contracts — call or WhatsApp directly</p>
          </div>
          {uniqueFarmers.map(([farmerId, farmer]: [string, any], i) => {
            const farmerContracts = rows.filter(c => c.farmer_id === farmerId);
            const crops = [...new Set(farmerContracts.map((c: any) => c.crop_type))].join(', ');
            return (
              <div key={farmerId} style={{ padding: '14px 18px', borderBottom: i < uniqueFarmers.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 13, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.blue, flexShrink: 0 }}>
                  {farmer?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{farmer?.full_name ?? 'Farmer'}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    {crops && <span style={{ textTransform: 'capitalize' }}>{crops}</span>}
                    {farmer?.location && ` · ${farmer.location}`}
                  </p>
                </div>
                {farmer?.phone_number && (
                  <a
                    href={`tel:${farmer.phone_number}`}
                    style={{ padding: '6px 14px', background: 'var(--color-sky-bg)', color: C.blue, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                  >
                    Call
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent system activity */}
      {notifs.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Recent Activity</p>
          </div>
          {notifs.map((n: any, i: number) => (
            <div key={n.id} style={{ padding: '13px 18px', borderBottom: i < notifs.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.read ? 'transparent' : C.blue, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: C.text, margin: '0 0 2px' }}>
                  {n.title ?? n.message ?? 'Update'}
                </p>
                {n.body && <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px' }}>{n.body}</p>}
                <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                  {new Date(n.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {uniqueFarmers.length === 0 && notifs.length === 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>No contacts yet</p>
          <p style={{ fontSize: 13, color: C.muted }}>Your farmer contacts from active contracts will appear here.</p>
        </div>
      )}
    </div>
  );
}
