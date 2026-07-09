import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Banknote, Plus, ArrowUpRight, Settings, ClipboardList, Wallet } from 'lucide-react';
import { AccountNumberBadge } from '@/components/wallet/AccountNumberBadge';
import type { JSX } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const TX_ICON: Record<string, JSX.Element> = {
  sale_payout:       <Banknote size={18} />,
  sale_payout_split: <Banknote size={18} />,
  contribution:      <Plus size={18} />,
  withdrawal:        <ArrowUpRight size={18} />,
  fee:               <Settings size={18} />,
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
          .select('id, name, wallet_balance, wallet_account_number')
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
  // Only 'sale_payout' actually lands in the pooled wallet_balance above —
  // 'sale_payout_split' pays each contributing member's own wallet directly,
  // so it must be excluded here or this figure would overstate the pool.
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
        <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 4px' }}>
          UGX {Math.round(walletBalance).toLocaleString()}
        </p>
        <div style={{ marginBottom: 16 }}><AccountNumberBadge accountNumber={group?.wallet_account_number} dark /></div>
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
          <span style={{ display: 'flex', color: C.green }}><ClipboardList size={20} /></span>
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
          <span style={{ display: 'flex', color: C.green }}><Plus size={20} /></span>
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: C.muted }}><Wallet size={32} /></div>
            <p style={{ color: C.muted, fontSize: 13 }}>
              No transactions yet. Sale proceeds will appear here after group listings are sold.
            </p>
          </div>
        ) : (
          <div>
            {txns.map((t: any) => {
              const isSplit = t.type === 'sale_payout_split';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'flex', color: C.amber }}>{TX_ICON[t.type] ?? <Banknote size={18} />}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                        {isSplit ? 'Sale — paid directly to members' : t.type?.replace(/_/g, ' ')}
                      </p>
                      {t.description && (
                        <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>{t.description}</p>
                      )}
                      <p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>
                        {new Date(t.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: isSplit ? C.muted : C.green, margin: 0, flexShrink: 0 }}>
                    {isSplit ? 'UGX' : '+UGX'} {Math.round(t.amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
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
