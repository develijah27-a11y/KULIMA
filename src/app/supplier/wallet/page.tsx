import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WalletActions } from '@/app/farmer/wallet/WalletActions';
import { Banknote } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const TXN_TYPE_CFG: Record<string, { label: string; color: string; sign: '+' | '-' }> = {
  deposit:        { label: 'Deposit',         color: 'var(--color-success)', sign: '+' },
  withdrawal:     { label: 'Withdrawal',       color: 'var(--color-danger)',  sign: '-' },
  escrow_lock:    { label: 'Escrow Hold',      color: 'var(--color-harvest)', sign: '-' },
  escrow_release: { label: 'Payment Received', color: 'var(--color-success)', sign: '+' },
  escrow_refund:  { label: 'Escrow Refund',    color: 'var(--color-sky)',     sign: '+' },
  transfer_in:    { label: 'Transfer In',      color: 'var(--color-success)', sign: '+' },
  transfer_out:   { label: 'Transfer Out',     color: 'var(--color-danger)',  sign: '-' },
};

export default async function SupplierWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [walletRes, txnsRes] = await Promise.all([
    (supabase.from as any)('wallets').select('*').eq('user_id', user.id).maybeSingle(),
    (supabase.from as any)('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
  ]);

  const wallet = walletRes.data;
  const txns = txnsRes.data ?? [];
  const balance = wallet?.balance ?? 0;
  const escrowBalance = wallet?.escrow_balance ?? 0;
  const totalIn  = txns.filter((t: any) => ['deposit','escrow_release','transfer_in'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalOut = txns.filter((t: any) => ['withdrawal','escrow_lock','transfer_out'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>My Wallet</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Kulima Pay — UGX</p>
      </div>

      <div style={{ background: C.green, borderRadius: 20, padding: '24px 24px 20px', color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Available Balance</p>
        <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 20px' }}>UGX {Math.round(balance).toLocaleString()}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>Total Received</p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(totalIn).toLocaleString()}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>Total Paid Out</p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(totalOut).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
        <WalletActions balance={balance} escrowBalance={escrowBalance} />
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Transaction History</p>
        </div>
        {txns.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--d-muted)' }}><Banknote size={40} /></div>
            <p style={{ color: C.muted, fontSize: 13 }}>No transactions yet. Deposit to get started.</p>
          </div>
        ) : (
          <div>
            {txns.map((t: any) => {
              const cfg = TXN_TYPE_CFG[t.type] ?? { label: t.type, color: C.muted, sign: '+' as const };
              const pending = t.status === 'pending';
              const failed = t.status === 'failed';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: failed ? 'var(--color-danger)' : C.text, margin: 0 }}>
                      {cfg.label}
                      {pending && <span style={{ fontSize: 10, color: 'var(--color-harvest)', fontWeight: 700, marginLeft: 6 }}>PENDING</span>}
                    </p>
                    <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>{new Date(t.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: failed ? C.muted : cfg.color, margin: 0 }}>
                    {cfg.sign}UGX {Math.round(t.amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
