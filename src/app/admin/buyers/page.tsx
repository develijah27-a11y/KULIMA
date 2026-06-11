import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
  cardShadow: 'var(--d-shadow-card)',
} as const;

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d/30)}mo ago`;
}

export default async function AdminBuyersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') redirect('/dashboard');

  const { data: buyers } = await (supabase.from as any)('profiles')
    .select('id, user_id, full_name, phone_number, location, created_at, verification_level, primary_crop')
    .eq('role', 'buyer')
    .order('created_at', { ascending: false });

  const rows = buyers ?? [];

  const VER: Record<string, { label: string; color: string; bg: string }> = {
    none:     { label: 'Unverified', color: C.muted,                bg: 'var(--color-surface-2)'  },
    basic:    { label: 'Basic',      color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
    standard: { label: 'Standard',  color: C.blue,                 bg: 'var(--color-sky-bg)'     },
    premium:  { label: 'Premium',   color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Buyer Accounts
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>{rows.length} registered buyer{rows.length !== 1 ? 's' : ''}</p>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🛒</p>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>No buyers yet</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Buyers will appear here once they register with the buyer role.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {/* Header */}
          <div className="hidden sm:grid px-5 py-3" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
            {['Buyer', 'Location', 'Verification', 'Joined'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{h}</p>
            ))}
          </div>

          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map((b: any) => {
              const ver = VER[b.verification_level ?? 'none'];
              return (
                <div key={b.id} className="px-5 py-3.5 flex items-center gap-4">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0" style={{ background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)' }}>
                      {(b.full_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{b.full_name ?? 'Unknown'}</p>
                      <p className="text-[10px] truncate" style={{ color: C.muted }}>{b.phone_number ?? '—'}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="hidden sm:block flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: C.muted }}>{b.location ?? '—'}</p>
                  </div>

                  {/* Verification */}
                  <div className="hidden sm:block" style={{ width: 100 }}>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: ver.bg, color: ver.color }}>{ver.label}</span>
                  </div>

                  {/* Joined */}
                  <div className="hidden sm:block" style={{ width: 80 }}>
                    <p className="text-xs" style={{ color: C.muted }}>{timeAgo(b.created_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    {b.verification_level === 'none' && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)' }}>
                        Needs KYC
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
