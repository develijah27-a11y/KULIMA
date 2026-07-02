import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  matched:   { label: 'Matched',   color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)'     },
  active:    { label: 'Active',    color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  completed: { label: 'Done',      color: 'var(--color-muted)',   bg: 'var(--color-surface-2)'  },
  cancelled: { label: 'Cancelled', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

export default async function PathologistConsultationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: consultations } = await (supabase.from as any)('consultations')
    .select('id, type, status, fee_ugx, farmer_district, notes, created_at, farmer:profiles!consultations_farmer_id_fkey(full_name, location)')
    .eq('pathologist_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = (consultations ?? []) as any[];

  const active    = list.filter(c => ['matched', 'active'].includes(c.status)).length;
  const total     = list.length;
  const earned    = list
    .filter(c => c.status === 'completed')
    .reduce((s, c) => s + Math.round(Number(c.fee_ugx) * 0.8), 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.03em' }}>
          Farmer Requests
        </h1>
        <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '3px 0 0' }}>
          Farmers who need your help — assigned to you
        </p>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Active',    value: active,  color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
            { label: 'Total',     value: total,   color: 'var(--d-text)',         bg: 'var(--d-card)' },
            { label: 'Earned',    value: `UGX ${earned >= 1e6 ? (earned/1e6).toFixed(1)+'M' : Math.round(earned/1000)+'K'}`, color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--d-shadow-card)' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: s.color, margin: '2px 0 0', fontWeight: 600, opacity: 0.75 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--d-card)', borderRadius: 18, boxShadow: 'var(--d-shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg></div>
          <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--d-text)', marginBottom: 6 }}>No consultations yet</p>
          <p style={{ fontSize: 13, color: 'var(--d-muted)' }}>
            When farmers book consultations, they will appear here. Make sure your profile is complete to be matched.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c) => {
            const farmer = c.farmer as any;
            const st = STATUS_CFG[c.status] ?? STATUS_CFG.pending;
            const myEarnings = Math.round(Number(c.fee_ugx) * 0.8);
            const isActionable = ['matched', 'active'].includes(c.status);

            return (
              <div key={c.id} style={{
                background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)',
                overflow: 'hidden',
              }}>
                {/* Card header */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--d-text)', margin: 0 }}>
                        {c.type === 'farm_visit' ? 'Farm Visit' : 'Remote Consultation'}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color, flexShrink: 0 }}>
                        {st.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: 0 }}>
                      {farmer?.full_name ?? 'Farmer'} · {c.farmer_district ?? farmer?.location ?? 'Uganda'}
                    </p>
                    {c.notes && (
                      <p style={{ fontSize: 11, color: 'var(--d-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>
                        &ldquo;{c.notes}&rdquo;
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: 'var(--d-muted)', margin: '4px 0 0' }}>
                      {new Date(c.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                      UGX {myEarnings.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--d-muted)', margin: '2px 0 0' }}>your share</p>
                  </div>
                </div>

                {/* Chat button for active/matched consultations */}
                {isActionable && (
                  <div style={{ padding: '0 18px 14px' }}>
                    <Link
                      href={`/pathologist/chat/${c.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        width: '100%', padding: '10px', borderRadius: 12,
                        background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                        fontSize: 13, fontWeight: 700, textDecoration: 'none',
                        border: '1.5px solid var(--color-primary)',
                      }}
                    >
                      Open Chat with Farmer
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
