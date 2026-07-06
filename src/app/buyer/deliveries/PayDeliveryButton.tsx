'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Delete, X } from 'lucide-react';

interface Props {
  deliveryId: string;
  amount: number;
}

// Simple PIN stored as a hex digest in localStorage.
// This is a UX lock, not a cryptographic one — the real auth is the JWT.
const PIN_KEY = 'agrinova_wpinhash';

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function PinPad({ title, subtitle, onConfirm, onCancel, confirmLabel = 'Confirm' }: {
  title: string;
  subtitle: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const press = (d: string) => setDigits(p => p.length < 4 ? [...p, d] : p);
  const del   = () => setDigits(p => p.slice(0, -1));

  return (
    // Full-screen overlay
    <div style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '28px 24px 20px', width: '100%', maxWidth: 340, boxShadow: '0 24px 64px rgba(0,0,0,0.30)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>{title}</p>
            <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '4px 0 0' }}>{subtitle}</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        {/* PIN dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: digits[i] !== undefined ? 'var(--color-primary)' : 'var(--color-surface-2)', border: '2px solid', borderColor: digits[i] !== undefined ? 'var(--color-primary)' : 'var(--color-border-mid)', transition: 'all 0.15s' }} />
          ))}
        </div>

        {/* Number pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
            if (k === '') return <div key={i} />;
            const isBack = k === '⌫';
            return (
              <button
                key={k}
                onClick={() => isBack ? del() : press(k)}
                style={{
                  height: 58, borderRadius: 12, border: '1.5px solid var(--color-border-mid)',
                  background: isBack ? 'var(--color-surface-2)' : 'var(--color-surface)',
                  cursor: 'pointer', fontSize: isBack ? 20 : 22, fontWeight: 700,
                  color: 'var(--d-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseDown={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLElement).style.background = isBack ? 'var(--color-surface-2)' : 'var(--color-surface)'; }}
              >
                {isBack ? <Delete size={20} /> : k}
              </button>
            );
          })}
        </div>

        {/* Confirm */}
        <button
          onClick={() => digits.length === 4 && onConfirm(digits.join(''))}
          disabled={digits.length < 4}
          style={{
            marginTop: 16, width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: digits.length === 4 ? 'var(--color-primary)' : 'var(--color-surface-2)',
            color: digits.length === 4 ? '#fff' : 'var(--d-muted)',
            fontWeight: 800, fontSize: 15, cursor: digits.length === 4 ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function PayDeliveryButton({ deliveryId, amount }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<'idle' | 'set-pin' | 'confirm-pin' | 'enter-pin' | 'paying'>('idle');
  const [pinError, setPinError] = useState('');
  const [newPinDraft, setNewPinDraft] = useState('');
  const [error, setError] = useState('');

  const hasPinStored = useCallback(() => !!localStorage.getItem(PIN_KEY), []);

  function startPay() {
    setPinError(''); setError('');
    if (hasPinStored()) {
      setStage('enter-pin');
    } else {
      setStage('set-pin');
    }
  }

  async function handleSetPin(pin: string) {
    setNewPinDraft(pin);
    setStage('confirm-pin');
  }

  async function handleConfirmPin(pin: string) {
    if (pin !== newPinDraft) {
      setPinError('PINs do not match. Try again.');
      setStage('set-pin');
      return;
    }
    const hash = await sha256hex(pin);
    localStorage.setItem(PIN_KEY, hash);
    setStage('paying');
    await doPayment();
  }

  async function handleEnterPin(pin: string) {
    const stored = localStorage.getItem(PIN_KEY);
    const hash = await sha256hex(pin);
    if (hash !== stored) {
      setPinError('Wrong PIN. Please try again.');
      setStage('enter-pin');
      return;
    }
    setStage('paying');
    await doPayment();
  }

  async function doPayment() {
    try {
      const res = await fetch('/api/deliveries/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_id: deliveryId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Payment failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setStage('idle');
    }
  }

  if (stage === 'paying') {
    return (
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontSize: 11, color: 'var(--d-muted)', margin: 0 }}>Processing…</p>
      </div>
    );
  }

  return (
    <>
      {/* Inline pay button */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <button
          onClick={startPay}
          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 700 }}
        >
          Pay UGX {amount.toLocaleString()}
        </button>
        {error && <p style={{ fontSize: 10, color: 'var(--color-danger)', margin: 0, maxWidth: 150, textAlign: 'right' }}>{error}</p>}
        {pinError && <p style={{ fontSize: 10, color: 'var(--color-danger)', margin: 0, maxWidth: 150, textAlign: 'right' }}>{pinError}</p>}
      </div>

      {/* PIN modals */}
      {stage === 'set-pin' && (
        <PinPad
          title="Create Wallet PIN"
          subtitle="Set a 4-digit PIN to secure your payments"
          confirmLabel="Set PIN →"
          onConfirm={handleSetPin}
          onCancel={() => setStage('idle')}
        />
      )}
      {stage === 'confirm-pin' && (
        <PinPad
          title="Confirm Wallet PIN"
          subtitle="Enter the same PIN again to confirm"
          confirmLabel="Confirm PIN →"
          onConfirm={handleConfirmPin}
          onCancel={() => setStage('idle')}
        />
      )}
      {stage === 'enter-pin' && (
        <PinPad
          title="Enter Wallet PIN"
          subtitle={`Paying UGX ${amount.toLocaleString()} from your wallet`}
          confirmLabel={`Pay UGX ${amount.toLocaleString()} →`}
          onConfirm={handleEnterPin}
          onCancel={() => setStage('idle')}
        />
      )}
    </>
  );
}
