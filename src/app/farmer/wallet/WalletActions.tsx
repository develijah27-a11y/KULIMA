'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

type Mode = null | 'deposit' | 'withdraw';

interface Props {
  balance: number;
  escrowBalance: number;
}

export function WalletActions({ balance, escrowBalance }: Props) {
  const router = useRouter();
  const [mode, setMode]       = useState<Mode>(null);
  const [amount, setAmount]   = useState('');
  const [phone, setPhone]     = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  function reset() { setMode(null); setAmount(''); setPhone(''); setError(''); setSuccess(''); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n < 500) { setError('Minimum amount is UGX 500'); return; }
    if (mode === 'withdraw' && n > balance) { setError('Insufficient balance'); return; }
    if (!phone.match(/^(0|\+?256)[0-9]{9}$/)) { setError('Enter a valid Uganda phone number'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/wallet/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: n, phone, provider }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Request failed');
      setSuccess(mode === 'deposit'
        ? 'A payment prompt has been sent to your phone. Approve it to complete the deposit.'
        : 'Withdrawal initiated. Funds will arrive within 5 minutes.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--color-success)' }}><CheckCircle2 size={40} /></div>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          {mode === 'deposit' ? 'Deposit Initiated' : 'Withdrawal Sent'}
        </p>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 16, maxWidth: 280, margin: '4px auto 16px' }}>{success}</p>
        <button onClick={reset} style={{ padding: '8px 20px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Done
        </button>
      </div>
    );
  }

  if (mode) {
    const isDeposit = mode === 'deposit';
    return (
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0 }}>
          {isDeposit ? 'Deposit via Mobile Money' : 'Withdraw to Mobile Money'}
        </p>
        {!isDeposit && (
          <p style={{ color: C.muted, fontSize: 12, margin: '-4px 0 0' }}>
            Available: <strong style={{ color: C.text }}>UGX {balance.toLocaleString()}</strong>
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {(['mtn', 'airtel'] as const).map(p => (
            <button
              key={p} type="button" onClick={() => setProvider(p)}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${provider === p ? C.green : C.border}`,
                background: provider === p ? 'var(--color-primary-bg)' : 'var(--d-input-bg)', fontWeight: 700, fontSize: 12,
                color: provider === p ? C.green : C.muted, cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              {p === 'mtn' ? 'MTN' : 'Airtel'}
            </button>
          ))}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>
            Phone Number
          </label>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="e.g. 0772000000"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.text, background: 'var(--d-input-bg)' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>
            Amount (UGX)
          </label>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Min: 500"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.text, background: 'var(--d-input-bg)' }}
          />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={reset}
            style={{ flex: 1, padding: '10px', background: 'var(--color-surface-2)', color: C.muted, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            style={{ flex: 2, padding: '10px', background: loading ? 'var(--color-surface-2)' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Processing...' : isDeposit ? 'Send Payment Prompt' : 'Withdraw Now'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button
        onClick={() => setMode('deposit')}
        style={{ flex: 1, padding: '11px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
      >
        + Deposit
      </button>
      <button
        onClick={() => setMode('withdraw')}
        disabled={balance <= 0}
        style={{ flex: 1, padding: '11px', background: balance > 0 ? 'var(--color-primary-bg)' : 'var(--color-surface-2)', color: balance > 0 ? C.greenMed : C.muted, border: `1px solid ${balance > 0 ? 'var(--color-primary-muted)' : C.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: balance > 0 ? 'pointer' : 'not-allowed' }}
      >
        Withdraw
      </button>
    </div>
  );
}
