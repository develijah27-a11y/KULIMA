import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const TX_ICON: Record<string, string> = {
  sale_payout: '💰', contribution: '➕', withdrawal: '↗', fee: '⚙',
};

export default async function GroupsWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Find the leader's profile to look up their group
  const { data: leaderProfile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single();

  const [groupRes, txnsRes, contribRes] = await Promise.allSettled([
    leaderProfile
      ? (supabase.from as any)('farmer_groups')
          .select('id, name, wallet_balance')
          .eq('leader_id', (leaderProfile as any).id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    (supabase.from as any)('group_wallet_transactions')
      .select('*')
      .eq('group_admin_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    (supabase.from as any)('group_contributions')
      .select('amount, contributed_at, member_name')
      .eq('admin_id', user.id)
      .order('contributed_at', { ascending: false })
      .limit(10),
  ]);

  const group    = groupRes.status === 'fulfilled' ? (groupRes.value as any)?.data : null;
  const txns     = ((txnsRes.status === 'fulfilled' ? (txnsRes.value as any)?.data : null) ?? []) as any[];
  const contribs = ((contribRes.status === 'fulfilled' ? (contribRes.value as any)?.data : null) ?? []) as any[];

  const walletBalance  = Number(group?.wallet_balance ?? 0);
  const totalContribs  = contribs.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const totalSales     = txns.filter((t: any) => t.type === 'sale_payout').reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>Group Wallet</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {group?.name ? `${group.name} — ` : ''}Pooled funds from sales and contributions
        </p>
      </div>

      {/* Balance card */}
      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 20, padding: '24px 24px 20px', color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          Group Wallet Balance
        </p>
        <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
          UGX {Math.round(walletBalance).toLocaleString()}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>
              From Sales
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(totalSales).toLocaleString()}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>
              Contributions
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(totalContribs).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link href="/groups/listings" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow,
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Group Listings</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>Manage sales</p>
          </div>
        </Link>
        <Link href="/groups/finance/record" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow,
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: 20 }}>➕</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Record Contribution</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>Log member funds</p>
          </div>
        </Link>
      </div>

      {/* Group sale transactions */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Wallet History</p>
        </div>
        {txns.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>💰</p>
            <p style={{ color: C.muted, fontSize: 13 }}>
              No transactions yet. Sale proceeds will appear here after group listings are sold.
            </p>
          </div>
        ) : (
          <div>
            {txns.map((t: any) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{TX_ICON[t.type] ?? '💸'}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                      {t.type?.replace(/_/g, ' ')}
                    </p>
                    {t.description && (
                      <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>{t.description}</p>
                    )}
                    <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>
                      {new Date(t.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.green, margin: 0, flexShrink: 0 }}>
                  +UGX {Math.round(t.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member contributions */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Member Contributions</p>
          <Link href="/groups/finance/record" style={{ fontSize: 12, fontWeight: 700, color: C.greenMed, textDecoration: 'none' }}>+ Record →</Link>
        </div>
        {contribs.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>No contributions recorded yet.</p>
          </div>
        ) : (
          <div>
            {contribs.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{c.member_name ?? c.name ?? 'Member'}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                    {new Date(c.contributed_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-success)', margin: 0 }}>
                  +UGX {Math.round(c.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
