'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Lock, Smartphone, RefreshCw, Check, ArrowRight } from 'lucide-react';

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
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [toAccount, setToAccount] = useState('');
  const [note, setNote]       = useState('');
  const [pin, setPin]         = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [activeReference, setActiveReference] = useState('');
  const [isAwaitingPin, setIsAwaitingPin] = useState(false);
  const [isDepositConfirmed, setIsDepositConfirmed] = useState(false);

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

  // Background status check when awaiting PIN approval
  useEffect(() => {
    if (!isAwaitingPin || !activeReference || isDepositConfirmed) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/wallet/deposit/status?ref=${encodeURIComponent(activeReference)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed') {
            setIsDepositConfirmed(true);
            setIsAwaitingPin(false);
            router.refresh();
          }
        }
      } catch {}
    }, 2000);

    const timeout = setTimeout(() => {
      setIsAwaitingPin(false);
    }, 45000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isAwaitingPin, activeReference, isDepositConfirmed, router]);

  function reset() {
    setMode(null); setAmount(''); setPhone(''); setToAccount(''); setNote('');
    setPin(''); setSetupPin(''); setSetupPinConfirm(''); setError(''); setSuccess('');
    setActiveReference(''); setIsAwaitingPin(false); setIsDepositConfirmed(false);
  }

  async function handleInstantConfirm() {
    if (!activeReference) return;
    setConfirming(true);
    try {
      const res = await fetch('/api/wallet/deposit/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: activeReference }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDepositConfirmed(true);
        setIsAwaitingPin(false);
        setSuccess(`UGX ${parseFloat(amount).toLocaleString()} deposit confirmed and credited to your wallet.`);
        router.refresh();
      }
    } catch {} finally {
      setConfirming(false);
    }
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

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone.match(/^(0|\+?256)[0-9]{9}$/)) {
      setError('Enter a valid Uganda phone number (e.g. 0772123456 or 0752123456)');
      return;
    }

    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/wallet/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: n, phone: cleanPhone, provider, pin: mode === 'withdraw' ? pin : undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Request failed');
      if (mode === 'deposit') {
        setActiveReference(json.reference || `PWP-${Date.now()}`);
        setSuccess(json.message || `Payment prompt sent to ${cleanPhone}. Please check your phone and enter your Mobile Money PIN.`);
        setIsAwaitingPin(true);
      } else {
        setSuccess(json.message || 'Withdrawal initiated. Funds will arrive on your phone shortly.');
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: isDepositConfirmed ? 'var(--color-success)' : '#10B981' }}>
          {isDepositConfirmed ? (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={32} color="#10B981" />
            </div>
          ) : mode === 'deposit' ? (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={30} className="animate-pulse" color="#10B981" />
            </div>
          ) : (
            <CheckCircle2 size={46} color="#10B981" />
          )}
        </div>

        <p style={{ color: C.text, fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
          {isDepositConfirmed
            ? 'Deposit Confirmed & Added!'
            : mode === 'deposit'
            ? 'Payment Prompt Dispatched'
            : mode === 'send'
            ? 'Money Sent'
            : 'Withdrawal Initiated'}
        </p>

        <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, maxWidth: 360, margin: '4px auto 16px' }}>
          {isDepositConfirmed
            ? `Your wallet balance has been updated with UGX ${parseFloat(amount || '0').toLocaleString()}.`
            : success}
        </p>

        {mode === 'deposit' && !isDepositConfirmed && (
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 12, padding: '12px 14px', maxWidth: 360, margin: '0 auto 16px', textAlign: 'left', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} className="animate-ping" />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Handset Instructions:</span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.4 }}>
              1. Look at your phone for the <strong>{provider === 'airtel' ? 'Airtel Money' : 'MTN MoMo'}</strong> PIN prompt.<br />
              2. Enter your PIN to approve the transaction.<br />
              3. Once entered, tap <strong>Confirm Deposit</strong> below.
            </p>
          </div>
        )}

        {isAwaitingPin && !isDepositConfirmed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: C.greenMed, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            <RefreshCw size={13} className="animate-spin" />
            <span>Listening for PIN confirmation...</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {mode === 'deposit' && !isDepositConfirmed && (
            <button
              type="button"
              disabled={confirming}
              onClick={handleInstantConfirm}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', background: C.green, color: '#fff', border: 'none',
                borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: confirming ? 'not-allowed' : 'pointer',
              }}
            >
              {confirming ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{confirming ? 'Verifying...' : 'I Have Approved (Confirm)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { router.refresh(); }}
            style={{ padding: '10px 16px', background: 'var(--color-surface-2)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={reset}
            style={{ padding: '10px 20px', background: isDepositConfirmed ? C.green : 'transparent', color: isDepositConfirmed ? '#fff' : C.muted, border: isDepositConfirmed ? 'none' : `1px solid ${C.border}`, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
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
            ? 'Select your network and phone number. An instant PIN prompt will be sent to your handset.'
            : `Available balance: UGX ${balance.toLocaleString()}`}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['airtel', 'mtn'] as const).map(p => (
            <button
              key={p} type="button" onClick={() => setProvider(p)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8,
                border: `2px solid ${provider === p ? (p === 'airtel' ? '#EF4444' : '#F59E0B') : C.border}`,
                background: provider === p
                  ? (p === 'airtel' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)')
                  : 'var(--d-input-bg)',
                fontWeight: 700, fontSize: 12,
                color: provider === p ? (p === 'airtel' ? '#DC2626' : '#D97706') : C.muted,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p === 'airtel' ? '#EF4444' : '#F59E0B' }} />
              {p === 'airtel' ? 'Airtel Money' : 'MTN Mobile Money'}
            </button>
          ))}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>
            {provider === 'airtel' ? 'Airtel Phone Number' : 'MTN Phone Number'}
          </label>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder={provider === 'airtel' ? 'e.g. 0752123456 or 0702123456' : 'e.g. 0772123456 or 0782123456'}
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
            style={{ flex: 2, padding: '10px', background: loading ? 'var(--color-surface-2)' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
            <span>{loading ? 'Sending Prompt...' : isDeposit ? 'Send Payment Prompt' : 'Withdraw Now'}</span>
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
