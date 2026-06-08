import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WalletActions } from './WalletActions';

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB', cardBg: '#FFFFFF',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
  green: '#1B4332', greenMed: '#40916C',
};

const TXN_TYPE_CFG: Record<string, { label: string; color: string; sign: '+' | '-' }> = {
  deposit:         { label: 'Deposit',          color: '#059669', sign: '+' },
  withdrawal:      { label: 'Withdrawal',        color: '#DC2626', sign: '-' },
  escrow_lock:     { label: 'Escrow Hold',       color: '#D97706', sign: '-' },
  escrow_release:  { label: 'Payment Received',  color: '#059669', sign: '+' },
  escrow_refund:   { label: 'Escrow Refund',     color: '#0284C7', sign: '+' },
  transfer_in:     { label: 'Transfer In',       color: '#059669', sign: '+' },
  transfer_out:    { label: 'Transfer Out',      color: '#DC2626', sign: '-' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function FarmerWalletPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const [walletRes, txnsRes, escrowRes] = await Promise.all([
    (supabase.from as any)('wallets').select('*').eq('user_id', session.user.id).maybeSingle(),
    (supabase.from as any)('wallet_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    (supabase.from as any)('escrow_accounts')
      .select('*, offer:offers(id, listing:listings(crop_type, quantity_kg))')
      .eq('seller_user_id', session.user.id)
      .in('status', ['funded', 'disputed'])
      .order('funded_at', { ascending: false }),
  ]);

  const wallet  = walletRes.data;
  const txns    = txnsRes.data ?? [];
  const escrows = escrowRes.data ?? [];

  const balance       = wallet?.balance ?? 0;
  const escrowBalance = wallet?.escrow_balance ?? 0;
  const totalIn  = txns.filter((t: any) => ['deposit','escrow_release','transfer_in'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalOut = txns.filter((t: any) => ['withdrawal','escrow_lock','transfer_out'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          My Wallet
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Kulima Pay — UGX</p>
      </div>

      {/* Balance card */}
      <div style={{ background: C.green, borderRadius: 20, padding: '24px 24px 20px', color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          Available Balance
        </p>
        <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          UGX {Math.round(balance).toLocaleString()}
        </p>
        {escrowBalance > 0 && (
          <p style={{ fontSize: 12, opacity: 0.65, margin: '0 0 20px' }}>
            + UGX {Math.round(escrowBalance).toLocaleString()} in escrow (held for active deals)
          </p>
        )}
        {escrowBalance === 0 && <div style={{ marginBottom: 20 }} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>Total Received</p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(totalIn).toLocaleString()}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', margin: '0 0 3px' }}>Total Sent Out</p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>UGX {Math.round(totalOut).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
        <WalletActions balance={balance} escrowBalance={escrowBalance} />
      </div>

      {/* Active escrow (payments awaiting release) */}
      {escrows.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>
            Pending Payments ({escrows.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {escrows.map((e: any) => {
              const crop = e.offer?.listing?.crop_type ?? 'Crop';
              const qty  = e.offer?.listing?.quantity_kg ?? 0;
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop} · {qty} kg</p>
                    <p style={{ fontSize: 11, color: '#D97706', margin: '2px 0 0', fontWeight: 600 }}>
                      {e.status === 'disputed' ? 'Under Dispute' : 'Awaiting delivery confirmation'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#D97706', margin: 0 }}>
                      UGX {Math.round(e.amount).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>held in escrow</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            Funds release to your wallet when the buyer confirms delivery.
          </p>
        </div>
      )}

      {/* Transaction history */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Transaction History</p>
        </div>

        {txns.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>💸</p>
            <p style={{ color: C.muted, fontSize: 13 }}>No transactions yet. Deposit to get started.</p>
          </div>
        ) : (
          <div>
            {txns.map((t: any) => {
              const cfg = TXN_TYPE_CFG[t.type] ?? { label: t.type, color: C.muted, sign: '+' as const };
              const pending = t.status === 'pending';
              const failed  = t.status === 'failed';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: failed ? '#DC2626' : C.text, margin: 0 }}>
                      {cfg.label}
                      {pending && <span style={{ fontSize: 10, color: '#D97706', fontWeight: 700, marginLeft: 6 }}>PENDING</span>}
                      {failed  && <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginLeft: 6 }}>FAILED</span>}
                    </p>
                    {t.description && <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{t.description}</p>}
                    <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>{fmtDate(t.created_at)}</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: failed ? C.muted : cfg.color, margin: 0, opacity: pending ? 0.6 : 1 }}>
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
