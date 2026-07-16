import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, CreditCard, ClipboardList, Snowflake } from 'lucide-react';
import { FreezeWalletButton } from './FreezeWalletButton';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  red: 'var(--color-danger)', blue: 'var(--color-sky)', amber: 'var(--color-harvest)',
};

// Matches the actual types written by lib/orders/escrow.ts and
// api/wallet/{deposit,withdraw,escrow} — the previous credit/debit/escrow/
// release/refund set was never used by any real insert, so every row here
// fell back to an unstyled raw type string.
const TX_CFG: Record<string, { color: string; label: string; credit: boolean }> = {
  deposit:       { color: 'var(--color-success)', label: 'Deposit',      credit: true  },
  payout:        { color: 'var(--color-success)', label: 'Payout',       credit: true  },
  escrow_refund: { color: '#7C3AED',              label: 'Refund',       credit: true  },
  withdrawal:    { color: 'var(--color-danger)',  label: 'Withdrawal',   credit: false },
  escrow_lock:   { color: 'var(--color-sky)',     label: 'Escrow Lock',  credit: false },
  fee:           { color: 'var(--color-harvest)', label: 'Platform Fee', credit: false },
};

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: admin } = await (supabase.from as any)('profiles').select('role').eq('user_id', user.id).single();
  if ((admin as any)?.role !== 'admin') redirect('/dashboard');

  const { q = '' } = await searchParams;

  const [walletsRes, txRes] = await Promise.all([
    (supabase.from as any)('wallets')
      .select('id, user_id, balance, currency, updated_at, is_frozen')
      .order('balance', { ascending: false })
      .limit(100),
    (supabase.from as any)('wallet_transactions')
      .select('id, wallet_id, user_id, type, amount, description, reference, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const wallets: any[] = walletsRes.data ?? [];
  const transactions: any[] = txRes.data ?? [];

  // wallets.user_id and wallet_transactions.user_id both reference
  // auth.users(id) directly (no FK to profiles), so the owner's name can't
  // be fetched via Supabase's embed shorthand — look profiles up separately
  // and merge by user_id instead.
  const ownerIds = [...new Set([...wallets.map(w => w.user_id), ...transactions.map(t => t.user_id)].filter(Boolean))];
  const { data: ownerProfiles } = ownerIds.length
    ? await (supabase.from as any)('profiles').select('user_id, full_name, role').in('user_id', ownerIds)
    : { data: [] };
  const ownerMap = new Map((ownerProfiles ?? []).map((p: any) => [p.user_id, p]));

  function ownerLabel(userId: string | null | undefined) {
    const p = userId ? ownerMap.get(userId) : null;
    if (!p) return 'Unknown user';
    return (p as any).role === 'groups' ? `${(p as any).full_name} (Group Wallet)` : (p as any).full_name ?? 'Unnamed user';
  }

  const tvl    = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);
  const active = wallets.filter(w => w.balance > 0).length;

  const filteredWallets = q
    ? wallets.filter(w => w.user_id?.includes(q) || ownerLabel(w.user_id).toLowerCase().includes(q.toLowerCase()))
    : wallets;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Wallet Management
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Platform escrow balances and transaction history</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Value Locked', value: `UGX ${fmt(tvl)}`, icon: <Building2 size={18} />, color: C.blue },
          { label: 'Active Wallets', value: active.toLocaleString(), icon: <CreditCard size={18} />, color: C.greenMed },
          { label: 'Recent Transactions', value: transactions.length.toLocaleString(), icon: <ClipboardList size={18} />, color: C.amber },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ display: 'flex', color }}>{icon}</span>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, margin: 0 }}>{label}</p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.03em', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Wallet list */}
        <div className="lg:col-span-3" style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>All Wallets</p>
            <form method="GET" style={{ display: 'flex', gap: 6 }}>
              <input name="q" defaultValue={q} placeholder="Filter by name or user ID…"
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 12, width: 180 }} />
              <button type="submit" style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Go</button>
            </form>
          </div>
          {filteredWallets.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: 13 }}>No wallets found</p>
            </div>
          ) : (
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {filteredWallets.map((w: any) => (
                <div key={w.user_id} style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: w.is_frozen ? 0.75 : 1 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
                        {ownerLabel(w.user_id)}
                      </p>
                      {w.is_frozen && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--color-danger-bg)', color: C.red }}>
                          <Snowflake size={9} /> Frozen
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0', fontFamily: 'monospace' }}>
                      {w.user_id?.slice(0, 18)}… · Updated {new Date(w.updated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: w.balance > 0 ? C.green : C.muted, margin: 0 }}>
                      UGX {Math.round(w.balance).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: C.muted, margin: '0 0 6px' }}>{w.currency ?? 'UGX'}</p>
                    <FreezeWalletButton userId={w.user_id} isFrozen={!!w.is_frozen} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="lg:col-span-2" style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Recent Transactions</p>
          </div>
          {transactions.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: 13 }}>No transactions yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {transactions.map((tx: any) => {
                const cfg = TX_CFG[tx.type] ?? { color: C.muted, label: tx.type, credit: false };
                return (
                  <div key={tx.id} style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: cfg.credit ? 'var(--color-success)' : C.red }}>
                        {cfg.credit ? '+' : '-'}UGX {Math.round(tx.amount).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.text, fontWeight: 600, margin: '0 0 1px' }}>{ownerLabel(tx.user_id)}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '0 0 1px' }}>{tx.description ?? tx.reference ?? '—'}</p>
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                      {new Date(tx.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
