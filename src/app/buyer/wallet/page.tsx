import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WalletActions } from '@/app/farmer/wallet/WalletActions';
import { WalletCard } from '@/components/wallet/WalletCard';
import { EscrowFundButton } from './EscrowFund';
import { syncPendingTransactions } from '@/lib/wallet/sync-pending';
import { Banknote } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const TXN_TYPE_CFG: Record<string, { label: string; color: string; sign: '+' | '-' }> = {
  deposit:         { label: 'Deposit',          color: 'var(--color-success)', sign: '+' },
  withdrawal:      { label: 'Withdrawal',        color: 'var(--color-danger)',  sign: '-' },
  escrow_lock:     { label: 'Escrow Funded',     color: 'var(--color-harvest)', sign: '-' },
  escrow_release:  { label: 'Escrow Released',   color: 'var(--d-muted)',       sign: '-' },
  escrow_refund:   { label: 'Escrow Refund',     color: 'var(--color-success)', sign: '+' },
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

export default async function BuyerWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Automatically reconcile any pending deposits/withdrawals with PrimePay
  await syncPendingTransactions(user.id);

  const [walletRes, txnsRes, escrowRes, acceptedOffersRes, profileRes] = await Promise.all([
    (supabase.from as any)('wallets').select('*').eq('user_id', user.id).maybeSingle(),
    (supabase.from as any)('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    (supabase.from as any)('escrow_accounts')
      .select('*, offer:offers(id, listing:listings(crop_type, quantity_kg))')
      .eq('buyer_user_id', user.id)
      .order('funded_at', { ascending: false }),
    // Accepted offers that don't yet have escrow
    (supabase.from as any)('offers')
      .select('id, offered_price, counter_price, listing:listings(crop_type, quantity_kg, asking_price)')
      .eq('buyer_id', user.id)
      .eq('status', 'accepted'),
    supabase.from('profiles').select('full_name').eq('user_id', user.id).single(),
  ]);

  const wallet         = walletRes.data;
  const txns           = txnsRes.data ?? [];
  const escrows        = escrowRes.data ?? [];
  const acceptedOffers = acceptedOffersRes.data ?? [];
  const holderName     = (profileRes.data as any)?.full_name ?? 'Cropify Buyer';

  const balance       = wallet?.balance ?? 0;
  const escrowBalance = wallet?.escrow_balance ?? 0;

  // Find accepted offers with no funded escrow
  const fundedOfferIds = new Set(escrows.map((e: any) => e.offer_id));
  const unfundedDeals  = acceptedOffers.filter((o: any) => !fundedOfferIds.has(o.id));

  const totalIn  = txns.filter((t: any) => ['deposit','escrow_refund','transfer_in'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalOut = txns.filter((t: any) => ['withdrawal','escrow_lock','transfer_out'].includes(t.type) && t.status === 'completed').reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          My Wallet
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Cropify Pay — UGX</p>
      </div>

      {/* Premium Unified Wallet Card */}
      <WalletCard
        balance={balance}
        accountNumber={wallet?.account_number}
        holderName={holderName}
        escrowBalance={escrowBalance}
      />

      {/* Period totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Total Deposited</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, fontFamily: 'var(--font-mono)' }}>UGX {Math.round(totalIn).toLocaleString()}</p>
        </div>
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Total Paid Out</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0, fontFamily: 'var(--font-mono)' }}>UGX {Math.round(totalOut).toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
        <WalletActions balance={balance} escrowBalance={escrowBalance} />
      </div>

      {/* Unfunded accepted deals */}
      {unfundedDeals.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-harvest)' }}>
            Action Required
          </p>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Fund Escrow for Accepted Deals</p>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
            Your offers were accepted. Fund escrow to secure the deal — the farmer gets paid when you confirm delivery.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {unfundedDeals.map((o: any) => {
              const crop    = o.listing?.crop_type ?? 'Crop';
              const qty     = o.listing?.quantity_kg ?? 0;
              const price   = o.counter_price ?? o.offered_price;
              const total   = Math.round(price * qty);
              return (
                <div key={o.id} style={{ padding: '14px', background: 'var(--color-harvest-bg)', borderRadius: 10, border: '1px solid var(--color-warning-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop}</p>
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{qty} kg · UGX {Math.round(price).toLocaleString()}/kg</p>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-harvest)', margin: 0 }}>
                      UGX {total.toLocaleString()}
                    </p>
                  </div>
                  <EscrowFundButton
                    offerId={o.id}
                    amount={total}
                    cropType={crop}
                    balance={balance}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active escrow accounts */}
      {escrows.filter((e: any) => e.status === 'funded').length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 20 }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>
            Active Escrow
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {escrows.filter((e: any) => e.status === 'funded').map((e: any) => {
              const crop = e.offer?.listing?.crop_type ?? 'Crop';
              const qty  = e.offer?.listing?.quantity_kg ?? 0;
              return (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--color-sky-bg)', borderRadius: 10, border: '1px solid var(--color-sky)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, textTransform: 'capitalize' }}>{crop} · {qty} kg</p>
                    <p style={{ fontSize: 11, color: 'var(--color-sky)', margin: '2px 0 0', fontWeight: 600 }}>Secured — awaiting delivery</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-sky)', margin: 0 }}>
                    UGX {Math.round(e.amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
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
              const cfg     = TXN_TYPE_CFG[t.type] ?? { label: t.type, color: C.muted, sign: '+' as const };
              const pending = t.status === 'pending';
              const failed  = t.status === 'failed';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: failed ? 'var(--color-danger)' : C.text, margin: 0 }}>
                      {cfg.label}
                      {pending && <span style={{ fontSize: 10, color: 'var(--color-harvest)', fontWeight: 700, marginLeft: 6 }}>PENDING</span>}
                      {failed  && <span style={{ fontSize: 10, color: 'var(--color-danger)', fontWeight: 700, marginLeft: 6 }}>FAILED</span>}
                    </p>
                    {t.description && <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{t.description}</p>}
                    <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>{fmtDate(t.created_at)}</p>
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
