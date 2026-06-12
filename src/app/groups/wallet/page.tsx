import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WalletActions } from '@/app/farmer/wallet/WalletActions';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

export default async function GroupsWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [walletRes, txnsRes, contribRes] = await Promise.all([
    (supabase.from as any)('wallets').select('*').eq('user_id', user.id).maybeSingle(),
    (supabase.from as any)('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    (supabase.from as any)('group_contributions').select('amount, contributed_at, name').eq('admin_id', user.id).order('contributed_at', { ascending: false }).limit(10).catch(() => ({ data: [] })),
  ]);

  const wallet = walletRes.data;
  const txns = txnsRes.data ?? [];
  const contribs = (contribRes.data ?? []) as any[];
  const balance = wallet?.balance ?? 0;
  const escrowBalance = wallet?.escrow_balance ?? 0;
  const totalContribs = contribs.reduce((s: number, c: any) => s + Number(c.amount), 0);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>Group Wallet</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Pooled funds and member contributions</p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 20, padding: '24px 24px 20px', color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Group Balance</p>
        <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 20px' }}>UGX {Math.round(balance).toLocaleString()}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>Member Contributions</p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(totalContribs).toLocaleString()}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>In Escrow</p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(escrowBalance).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
        <WalletActions balance={balance} escrowBalance={escrowBalance} />
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Member Contributions</p>
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
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{c.name ?? 'Member'}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{new Date(c.contributed_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-success)', margin: 0 }}>+UGX {Math.round(c.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Transaction History</p>
        </div>
        {txns.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>No transactions yet.</p>
          </div>
        ) : (
          <div>
            {txns.map((t: any) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{t.type?.replace(/_/g, ' ')}</p>
                  <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>{new Date(t.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.muted, margin: 0 }}>UGX {Math.round(t.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
