import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WalletActions } from './WalletActions';
import { WalletCard } from '@/components/wallet/WalletCard';
import { Banknote } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const TXN_TYPE_CFG: Record<string, { label: string; color: string; sign: '+' | '-' }> = {
  deposit:         { label: 'Deposit',          color: 'var(--color-success)', sign: '+' },
  withdrawal:      { label: 'Withdrawal',        color: 'var(--color-danger)',  sign: '-' },
  escrow_lock:     { label: 'Escrow Hold',       color: 'var(--color-harvest)', sign: '-' },
  escrow_release:  { label: 'Payment Received',  color: 'var(--color-success)', sign: '+' },
  escrow_refund:   { label: 'Escrow Refund',     color: 'var(--color-sky)',     sign: '+' },
  transfer_in:     { label: 'Transfer In',       color: 'var(--color-success)', sign: '+' },
  transfer_out:    { label: 'Transfer Out',      color: 'var(--color-danger)',  sign: '-' },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const day = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-UG', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} • ${time}`;
}

export default async function FarmerWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [walletRes, txnsRes, escrowRes, profileRes] = await Promise.all([
    (supabase.from as any)('wallets').select('*').eq('user_id', user.id).maybeSingle(),
    (supabase.from as any)('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    (supabase.from as any)('escrow_accounts')
      .select('*, offer:offers(id, listing:listings(crop_type, quantity_kg))')
      .eq('seller_user_id', user.id)
      .in('status', ['funded', 'disputed'])
      .order('funded_at', { ascending: false }),
    supabase.from('profiles').select('full_name').eq('user_id', user.id).single(),
  ]);

  const wallet  = walletRes.data;
  const txns    = txnsRes.data ?? [];
  const escrows = escrowRes.data ?? [];
  const holderName = (profileRes.data as any)?.full_name ?? 'Cropify User';

  const balance       = wallet?.balance ?? 0;
  const escrowBalance = wallet?.escrow_balance ?? 0;
  const totalIn  = txns.filter((t: any) => ['deposit','escrow_release','transfer_in'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalOut = txns.filter((t: any) => ['withdrawal','escrow_lock','transfer_out'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          My Wallet
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Cropify Pay — UGX</p>
      </div>

      {/* Balance card */}
      <WalletCard
        balance={balance}
        accountNumber={wallet?.account_number}
        holderName={holderName}
        escrowBalance={escrowBalance}
      />

      {/* Period totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Total Received</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, fontFamily: 'var(--font-mono)' }}>UGX {Math.round(totalIn).toLocaleString()}</p>
        </div>
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Total Sent Out</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, fontFamily: 'var(--font-mono)' }}>UGX {Math.round(totalOut).toLocaleString()}</p>
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
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-harvest-bg)', borderRadius: 10, border: '1px solid var(--color-warning-border)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop} · {qty} kg</p>
                    <p style={{ fontSize: 11, color: 'var(--color-harvest)', margin: '2px 0 0', fontWeight: 600 }}>
                      {e.status === 'disputed' ? 'Under Dispute' : 'Awaiting delivery confirmation'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-harvest)', margin: 0, fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--d-muted)' }}><Banknote size={40} /></div>
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
                    <p style={{ fontSize: 13, fontWeight: 600, color: failed ? 'var(--color-danger)' : C.text, margin: 0 }}>
                      {cfg.label}
                    </p>
                    {t.description && <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{t.description}</p>}
                    <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>
                      {fmtDate(t.created_at)} · {pending ? 'Pending' : failed ? 'Failed' : 'Successful'}
                    </p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: failed ? C.muted : cfg.color, margin: 0, opacity: pending ? 0.6 : 1, fontFamily: 'var(--font-mono)' }}>
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
