'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Lock, Smartphone, RefreshCw } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

type Mode = null | 'deposit' | 'withdraw' | 'send';

interface Props {
  balance: number;
  escrowBalance: number;
}

const pinInputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`,
  fontSize: 20, letterSpacing: '0.5em', textAlign: 'center' as const, outline: 'none',
  boxSizing: 'border-box' as const, color: C.text, background: 'var(--d-input-bg)',
};

export function WalletActions({ balance, escrowBalance }: Props) {
  const router = useRouter();
  const [mode, setMode]       = useState<Mode>(null);
  const [amount, setAmount]   = useState('');
  const [phone, setPhone]     = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [toAccount, setToAccount] = useState('');
  const [note, setNote]       = useState('');
  const [pin, setPin]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [isAwaitingPin, setIsAwaitingPin] = useState(false);

  const [hasPin, setHasPin]   = useState<boolean | null>(null);
  const [pinCheckDone, setPinCheckDone] = useState(false);
  const [setupPin, setSetupPin]         = useState('');
  const [setupPinConfirm, setSetupPinConfirm] = useState('');

  const needsPinCheck = mode === 'withdraw' || mode === 'send';

  useEffect(() => {
    if (!needsPinCheck || pinCheckDone) return;
    fetch('/api/wallet/pin')
      .then(res => res.json())
      .then(json => { setHasPin(!!json.hasPin); setPinCheckDone(true); })
      .catch(() => setPinCheckDone(true));
  }, [needsPinCheck, pinCheckDone]);

  // Auto-refresh balance in the background while awaiting PIN approval
  useEffect(() => {
    if (!isAwaitingPin) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);
    const timeout = setTimeout(() => {
      setIsAwaitingPin(false);
    }, 35000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isAwaitingPin, router]);

  function reset() {
    setMode(null); setAmount(''); setPhone(''); setToAccount(''); setNote('');
    setPin(''); setSetupPin(''); setSetupPinConfirm(''); setError(''); setSuccess('');
    setIsAwaitingPin(false);
  }

  async function submitPinSetup(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(setupPin)) { setError('PIN must be exactly 4 digits'); return; }
    if (setupPin !== setupPinConfirm) { setError('PINs don\'t match'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/wallet/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: setupPin }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to set PIN');
      setHasPin(true);
      setSetupPin(''); setSetupPinConfirm('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n < 500) { setError('Minimum amount is UGX 500'); return; }
    if ((mode === 'withdraw' || mode === 'send') && n > balance) { setError('Insufficient balance'); return; }
    if (needsPinCheck && !/^\d{4}$/.test(pin)) { setError('Enter your 4-digit wallet PIN'); return; }

    if (mode === 'send') {
      if (!toAccount.trim()) { setError('Enter the recipient\'s account number'); return; }
      setLoading(true); setError('');
      try {
        const res = await fetch('/api/wallet/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountNumber: toAccount.trim(), amount: n, note: note || undefined, pin }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? 'Transfer failed');
        setSuccess(`UGX ${n.toLocaleString()} sent to ${toAccount.trim().toUpperCase()}.`);
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!phone.match(/^(0|\+?256)[0-9]{9}$/)) { setError('Enter a valid Uganda phone number (e.g. 0772000000 or 0752000000)'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/wallet/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: n, phone, provider, pin: mode === 'withdraw' ? pin : undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Request failed');
      if (mode === 'deposit') {
        setSuccess(json.message || `A payment prompt has been sent to ${phone}. Please check your phone screen and enter your Mobile Money PIN to approve the deposit.`);
        setIsAwaitingPin(true);
      } else {
        setSuccess(json.message || 'Withdrawal initiated. Funds will arrive on your mobile phone shortly.');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--color-success)' }}>
          {mode === 'deposit' ? <Smartphone size={44} className="animate-pulse" /> : <CheckCircle2 size={44} />}
        </div>
        <p style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
          {mode === 'deposit' ? 'Prompt Sent to Your Phone' : mode === 'send' ? 'Money Sent' : 'Withdrawal Initiated'}
        </p>
        <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, maxWidth: 360, margin: '4px auto 16px' }}>{success}</p>

        {isAwaitingPin && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: C.greenMed, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            <RefreshCw size={14} className="animate-spin" />
            <span>Waiting for PIN confirmation on your handset...</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => { router.refresh(); }}
            style={{ padding: '9px 18px', background: 'var(--color-surface-2)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Refresh Balance
          </button>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '9px 22px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (needsPinCheck && pinCheckDone && hasPin === false) {
    return (
      <form onSubmit={submitPinSetup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Lock size={15} /> Set Up Your Wallet PIN
        </p>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          A 4-digit PIN protects your money — you'll enter it every time you withdraw or send funds.
        </p>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>New 4-digit PIN</label>
          <input
            type="password" inputMode="numeric" maxLength={4} value={setupPin}
            onChange={e => setSetupPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••" style={pinInputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>Confirm PIN</label>
          <input
            type="password" inputMode="numeric" maxLength={4} value={setupPinConfirm}
            onChange={e => setSetupPinConfirm(e.target.value.replace(/\D/g, ''))}
            placeholder="••••" style={pinInputStyle}
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
            {loading ? 'Saving...' : 'Save PIN & Continue'}
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'send') {
    return (
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0 }}>Send to Another Account</p>
        <p style={{ color: C.muted, fontSize: 12, margin: '-4px 0 0' }}>
          Available: <strong style={{ color: C.text }}>UGX {balance.toLocaleString()}</strong>
        </p>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>
            Recipient Account Number
          </label>
          <input
            type="text" value={toAccount} onChange={e => setToAccount(e.target.value.toUpperCase())}
            placeholder="e.g. AGN1234567890"
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

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>
            Note <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="What's this for?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.text, background: 'var(--d-input-bg)' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Lock size={11} /> Wallet PIN
          </label>
          <input
            type="password" inputMode="numeric" maxLength={4} value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••" style={pinInputStyle}
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
            {loading ? 'Sending...' : 'Send Money'}
          </button>
        </div>
      </form>
    );
  }

  if (mode) {
    const isDeposit = mode === 'deposit';
    return (
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0 }}>
          {isDeposit ? 'Deposit via Mobile Money' : 'Withdraw to Mobile Money'}
        </p>
        <p style={{ color: C.muted, fontSize: 12, margin: '-4px 0 0' }}>
          {isDeposit
            ? 'A prompt will be sent directly to your phone. Enter your Mobile Money PIN on your handset to approve.'
            : `Available balance: UGX ${balance.toLocaleString()}`}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['mtn', 'airtel'] as const).map(p => (
            <button
              key={p} type="button" onClick={() => setProvider(p)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8,
                border: `2px solid ${provider === p ? (p === 'mtn' ? '#F59E0B' : '#EF4444') : C.border}`,
                background: provider === p
                  ? (p === 'mtn' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)')
                  : 'var(--d-input-bg)',
                fontWeight: 700, fontSize: 12,
                color: provider === p ? (p === 'mtn' ? '#D97706' : '#DC2626') : C.muted,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p === 'mtn' ? '#F59E0B' : '#EF4444' }} />
              {p === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money'}
            </button>
          ))}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>
            {provider === 'mtn' ? 'MTN Phone Number' : 'Airtel Phone Number'}
          </label>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder={provider === 'mtn' ? 'e.g. 0772123456' : 'e.g. 0752123456'}
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

        {!isDeposit && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Lock size={11} /> Wallet PIN
            </label>
            <input
              type="password" inputMode="numeric" maxLength={4} value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••" style={pinInputStyle}
            />
          </div>
        )}

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={reset}
            style={{ flex: 1, padding: '10px', background: 'var(--color-surface-2)', color: C.muted, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            style={{ flex: 2, padding: '10px', background: loading ? 'var(--color-surface-2)' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Sending Prompt...' : isDeposit ? 'Send Payment Prompt' : 'Withdraw Now'}
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
        onClick={() => setMode('send')}
        disabled={balance <= 0}
        style={{ flex: 1, padding: '11px', background: balance > 0 ? 'var(--color-sky-bg)' : 'var(--color-surface-2)', color: balance > 0 ? 'var(--color-sky)' : C.muted, border: `1px solid ${balance > 0 ? 'var(--color-sky-muted)' : C.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: balance > 0 ? 'pointer' : 'not-allowed' }}
      >
        Send
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
