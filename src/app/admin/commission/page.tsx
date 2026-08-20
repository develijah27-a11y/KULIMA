'use client';

import { useState, useEffect, useTransition } from 'react';
import { CheckCircle2, X, TrendingUp, DollarSign, BarChart3, Calendar } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  blue: 'var(--color-sky)', blueBg: 'var(--color-sky-bg)',
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 260, background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        {ok ? <CheckCircle2 size={16} /> : <X size={16} />}{msg}
      </p>
    </div>
  );
}

// ── Pure-CSS bar chart ─────────────────────────────────────────────────────────
function BarChart({
  data, color = C.green, valueLabel = 'UGX',
}: {
  data: { label: string; value: number }[];
  color?: string;
  valueLabel?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '0 4px' }}>
      {data.map(({ label, value }) => {
        const pct = (value / max) * 100;
        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: C.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
                : value >= 1000 ? `${Math.round(value / 1000)}K`
                : value > 0 ? String(value) : ''}
            </span>
            <div
              style={{
                width: '100%', background: color, borderRadius: '4px 4px 0 0',
                height: `${Math.max(pct, value > 0 ? 4 : 0)}%`,
                minHeight: value > 0 ? 4 : 0,
                transition: 'height 0.5s ease',
                opacity: 0.85,
              }}
              title={`${valueLabel} ${value.toLocaleString()}`}
            />
            <span style={{ fontSize: 9, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

type Period = 'today' | '7d' | '30d' | '12m';

interface EarningsData {
  totalCommission: number;
  totalTransactions: number;
  avgFeePerTx: number;
  chart: { label: string; value: number }[];
}

interface PlatformWallet { balance: number; account_number: string; owner_name: string | null; }
interface AdminOption { user_id: string; full_name: string | null; }

export default function AdminCommissionPage() {
  const [rate, setRate]     = useState(2.5);
  const [minFee, setMinFee] = useState(500);
  const [maxFee, setMaxFee] = useState(0);
  const [walletUserId, setWalletUserId] = useState<string | null>(null);
  const [platformWallet, setPlatformWallet] = useState<PlatformWallet | null>(null);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [pending, start]    = useTransition();
  const [walletPending, startWallet] = useTransition();

  // Earnings report state
  const [period, setPeriod]       = useState<Period>('7d');
  const [earnings, setEarnings]   = useState<EarningsData | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function refresh() {
    return fetch('/api/admin/commission')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setRate(json.data.rate_percent ?? 2.5);
          setMinFee(json.data.min_fee_ugx ?? 500);
          setMaxFee(json.data.max_fee_ugx ?? 0);
          setWalletUserId(json.data.platform_wallet_user_id ?? null);
        }
        setPlatformWallet(json.platformWallet ?? null);
        setAdmins(json.admins ?? []);
      });
  }

  function fetchEarnings(p: Period) {
    setEarningsLoading(true);
    fetch(`/api/admin/commission/earnings?period=${p}`)
      .then(r => r.json())
      .then(json => setEarnings(json.data ?? null))
      .catch(() => {})
      .finally(() => setEarningsLoading(false));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    fetchEarnings('7d');
  }, []);

  useEffect(() => { fetchEarnings(period); }, [period]);

  function handleSave() {
    start(async () => {
      const res = await fetch('/api/admin/commission', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate_percent: rate, min_fee_ugx: minFee, max_fee_ugx: maxFee || null }),
      });
      const json = await res.json();
      if (json.success) showToast('Commission settings saved', true);
      else showToast(json.error ?? 'Failed to save', false);
    });
  }

  function handleWalletChange(userId: string) {
    setWalletUserId(userId);
    startWallet(async () => {
      const res = await fetch('/api/admin/commission', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate_percent: rate, min_fee_ugx: minFee, max_fee_ugx: maxFee || null, platform_wallet_user_id: userId }),
      });
      const json = await res.json();
      if (json.success) { showToast('Platform wallet updated', true); refresh(); }
      else showToast(json.error ?? 'Failed to update platform wallet', false);
    });
  }

  const examples = [50000, 200000, 500000, 1000000, 5000000];
  function calcFee(amount: number) {
    let fee = Math.round(amount * rate / 100);
    if (fee < minFee) fee = minFee;
    if (maxFee > 0 && fee > maxFee) fee = maxFee;
    return fee;
  }

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d',    label: '7 days' },
    { key: '30d',   label: '30 days' },
    { key: '12m',   label: '12 months' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>Commission</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
          Earnings reports and platform fee configuration.
        </p>
      </div>

      {/* ── Earnings overview KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total Collected',
            value: earnings ? `UGX ${earnings.totalCommission >= 1_000_000 ? (earnings.totalCommission / 1_000_000).toFixed(1) + 'M' : Math.round(earnings.totalCommission / 1000) + 'K'}` : '—',
            icon: <DollarSign size={15} />, color: C.green,
          },
          {
            label: 'Transactions',
            value: earnings ? earnings.totalTransactions.toLocaleString() : '—',
            icon: <BarChart3 size={15} />, color: C.blue,
          },
          {
            label: 'Avg Fee',
            value: earnings ? `UGX ${Math.round(earnings.avgFeePerTx).toLocaleString()}` : '—',
            icon: <TrendingUp size={15} />, color: C.amber,
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
              <span style={{ color }}>{icon}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 900, color, margin: 0, letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Earnings chart ── */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} style={{ color: C.green }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Commission Earned</p>
          </div>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: period === key ? C.green : 'var(--color-surface-2)',
                  color: period === key ? '#fff' : C.muted,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '20px 16px 12px' }}>
          {earningsLoading ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: C.muted }}>Loading…</p>
            </div>
          ) : earnings?.chart && earnings.chart.length > 0 ? (
            <BarChart data={earnings.chart} color={C.green} />
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <BarChart3 size={28} style={{ color: C.muted }} />
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No commission data for this period</p>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ background: C.cardBg, borderRadius: 18, height: 200, boxShadow: C.cardShadow }} className="dash-skeleton" />
      ) : (
        <>
          {/* Platform wallet */}
          <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 18, padding: '22px 24px', color: '#fff' }}>
            <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              Platform Wallet — Commission Collected
            </p>
            {platformWallet ? (
              <>
                <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px', fontFamily: 'var(--font-mono)' }}>
                  UGX {Math.round(platformWallet.balance).toLocaleString()}
                </p>
                <p style={{ fontSize: 12, opacity: 0.75, margin: '0 0 4px' }}>
                  {platformWallet.owner_name ?? 'Admin'} · Account {platformWallet.account_number}
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, opacity: 0.85, margin: '0 0 4px' }}>
                No platform wallet configured yet — pick an admin account below.
              </p>
            )}
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, display: 'block', marginBottom: 6 }}>
                Receiving admin account
              </label>
              <select
                value={walletUserId ?? ''}
                disabled={walletPending}
                onChange={e => handleWalletChange(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontWeight: 600 }}
              >
                <option value="" style={{ color: '#111' }}>Not configured</option>
                {admins.map(a => (
                  <option key={a.user_id} value={a.user_id} style={{ color: '#111' }}>{a.full_name ?? a.user_id}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rate config */}
          <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 20px' }}>Rate Configuration</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>Commission Rate (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input type="range" min={0.5} max={10} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" value={rate} onChange={e => setRate(Math.max(0.1, Math.min(20, Number(e.target.value))))} step={0.1} min={0.1} max={20} style={{ width: 72, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 15, fontWeight: 800, color: C.text, background: 'var(--d-input-bg)', textAlign: 'center' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>%</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0' }}>Current: {rate}% of each transaction amount</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>Minimum Fee (UGX)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.muted, fontWeight: 600 }}>UGX</span>
                <input type="number" value={minFee} onChange={e => setMinFee(Math.max(0, Number(e.target.value)))} min={0} step={100} style={{ width: '100%', padding: '11px 12px 11px 46px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 700, color: C.text, background: 'var(--d-input-bg)', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>Maximum Fee (UGX) — 0 means no cap</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.muted, fontWeight: 600 }}>UGX</span>
                <input type="number" value={maxFee} onChange={e => setMaxFee(Math.max(0, Number(e.target.value)))} min={0} step={1000} style={{ width: '100%', padding: '11px 12px 11px 46px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 700, color: C.text, background: 'var(--d-input-bg)', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={handleSave} disabled={pending} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: pending ? C.greenBg : C.green, color: pending ? C.green : '#fff', fontSize: 15, fontWeight: 800, cursor: pending ? 'wait' : 'pointer' }}>
              {pending ? '⏳ Saving…' : 'Save Commission Settings'}
            </button>
          </div>

          {/* Fee preview */}
          <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Fee Preview</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>How much sellers receive at current rate</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted }}>Sale Amount</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.muted }}>Platform Fee</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.muted }}>Seller Receives</th>
                </tr>
              </thead>
              <tbody>
                {examples.map(amt => {
                  const fee = calcFee(amt);
                  return (
                    <tr key={amt} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: C.text, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>UGX {amt.toLocaleString()}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: C.amber, fontWeight: 600, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>UGX {fee.toLocaleString()}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 800, color: C.green, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>UGX {(amt - fee).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ background: C.greenBg, borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: 0 }}>How commission works</p>
              <p style={{ fontSize: 12, color: '#065F46', margin: '4px 0 0', opacity: 0.85, lineHeight: 1.5 }}>
                When a buyer confirms receipt, the escrow is released. The platform fee is deducted and the net transferred to the seller&apos;s wallet. All deductions are logged for full audit visibility.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
