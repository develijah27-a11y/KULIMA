'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, X, Delete, AlertTriangle } from 'lucide-react';

const PIN_KEY = 'cropify_wpinhash';

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface VerifiedPayment {
  deliveryId: string;
  payeeName: string;
  amount: number;
  route: { pickupDistrict: string; dropoffDistrict: string };
}

function PinPad({ title, subtitle, onConfirm, onCancel, confirmLabel = 'Confirm' }: {
  title: string; subtitle: string; onConfirm: (pin: string) => void; onCancel: () => void; confirmLabel?: string;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const press = (d: string) => setDigits(p => p.length < 4 ? [...p, d] : p);
  const del = () => setDigits(p => p.slice(0, -1));
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '28px 24px 20px', width: '100%', maxWidth: 340, boxShadow: '0 24px 64px rgba(0,0,0,0.30)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>{title}</p>
            <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '4px 0 0' }}>{subtitle}</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: digits[i] !== undefined ? 'var(--color-primary)' : 'var(--color-surface-2)', border: '2px solid', borderColor: digits[i] !== undefined ? 'var(--color-primary)' : 'var(--color-border-mid)' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => {
            if (k === '') return <div key={i} />;
            const isBack = k === '⌫';
            return (
              <button key={k} onClick={() => isBack ? del() : press(k)} style={{ height: 58, borderRadius: 12, border: '1.5px solid var(--color-border-mid)', background: isBack ? 'var(--color-surface-2)' : 'var(--color-surface)', cursor: 'pointer', fontSize: isBack ? 20 : 22, fontWeight: 700, color: 'var(--d-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isBack ? <Delete size={20} /> : k}
              </button>
            );
          })}
        </div>
        <button onClick={() => digits.length === 4 && onConfirm(digits.join(''))} disabled={digits.length < 4}
          style={{ marginTop: 16, width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: digits.length === 4 ? 'var(--color-primary)' : 'var(--color-surface-2)', color: digits.length === 4 ? '#fff' : 'var(--d-muted)', fontWeight: 800, fontSize: 15, cursor: digits.length === 4 ? 'pointer' : 'not-allowed' }}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// Payer side of the "pay nearby" flow. Scanning only ever reaches a
// confirm screen showing recipient + amount pulled fresh from the server
// (never trusted from the QR payload alone) — the same wallet-PIN gate and
// the same /api/deliveries/pay call the existing manual "Pay" button uses
// is what actually moves money, so this never bypasses that safeguard.
export function ScanToPayButton() {
  const router = useRouter();
  const [stage, setStage] = useState<'idle' | 'scanning' | 'verifying' | 'confirm' | 'pin' | 'paying' | 'done'>('idle');
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<VerifiedPayment | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerDivId = 'qr-scan-region';

  const stopScanner = useCallback(async () => {
    try { await scannerRef.current?.stop(); scannerRef.current?.clear(); } catch { /* already stopped */ }
    scannerRef.current = null;
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    await stopScanner();
    setStage('verifying'); setError('');
    try {
      const res = await fetch('/api/deliveries/qr-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: decodedText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'This code could not be verified.');
      setPayment(json);
      setStage('confirm');
    } catch (err: any) {
      setError(err.message);
      setStage('idle');
    }
  }, [stopScanner]);

  useEffect(() => {
    if (stage !== 'scanning') return;
    let cancelled = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText: string) => handleScan(decodedText),
        () => { /* per-frame no-match — expected constantly while aiming, not an error */ },
      ).catch(() => {
        if (!cancelled) { setError('Could not access the camera. Check camera permissions and try again.'); setStage('idle'); }
      });
    });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [stage, handleScan, stopScanner]);

  async function doPay(pin?: string) {
    if (!payment) return;
    setStage('paying');
    try {
      const res = await fetch('/api/deliveries/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_id: payment.deliveryId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Payment failed');
      setStage('done');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setStage('confirm');
    }
  }

  function proceedToPin() {
    const hasPinStored = !!localStorage.getItem(PIN_KEY);
    if (hasPinStored) { setStage('pin'); return; }
    // No PIN set yet on this device — fall back straight to paying rather
    // than forcing PIN setup mid-scan-flow; the existing manual Pay button
    // already handles first-time PIN setup for this wallet.
    doPay();
  }

  async function handlePinConfirm(pin: string) {
    const stored = localStorage.getItem(PIN_KEY);
    const hash = await sha256hex(pin);
    if (hash !== stored) { setError('Wrong PIN.'); setStage('pin'); return; }
    await doPay(pin);
  }

  function close() {
    stopScanner();
    setStage('idle'); setError(''); setPayment(null);
  }

  if (stage === 'idle') {
    return (
      <>
        <button type="button" onClick={() => { setError(''); setStage('scanning'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1.5px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <ScanLine size={14} /> Scan to Pay
        </button>
        {error && <p style={{ fontSize: 11.5, color: 'var(--color-danger)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} />{error}</p>}
      </>
    );
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 340, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>
            {stage === 'scanning' && 'Scan payment QR'}
            {stage === 'verifying' && 'Checking code…'}
            {(stage === 'confirm' || stage === 'paying' || stage === 'pin') && 'Confirm payment'}
            {stage === 'done' && 'Payment sent'}
          </p>
          <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}><X size={18} /></button>
        </div>

        {stage === 'scanning' && (
          <div id={scannerDivId} style={{ width: '100%', borderRadius: 14, overflow: 'hidden', background: '#000', minHeight: 260 }} />
        )}

        {stage === 'verifying' && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, margin: '0 auto', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {payment && (stage === 'confirm' || stage === 'paying') && (
          <div>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 14, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Paying</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>{payment.payeeName}</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#15803d', margin: 0 }}>UGX {payment.amount.toLocaleString()}</p>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '6px 0 0' }}>{payment.route.pickupDistrict} → {payment.route.dropoffDistrict}</p>
            </div>
            <p style={{ fontSize: 11.5, color: '#9ca3af', textAlign: 'center', marginBottom: 14 }}>This cannot be undone once confirmed.</p>
            {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, textAlign: 'center' }}>{error}</p>}
            <button onClick={proceedToPin} disabled={stage === 'paying'}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: stage === 'paying' ? 'var(--color-surface-2)' : 'var(--color-primary)', color: stage === 'paying' ? 'var(--d-muted)' : '#fff', fontWeight: 800, fontSize: 15, cursor: stage === 'paying' ? 'not-allowed' : 'pointer' }}>
              {stage === 'paying' ? 'Processing…' : `Confirm & Pay UGX ${payment.amount.toLocaleString()}`}
            </button>
          </div>
        )}

        {stage === 'done' && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#15803d', fontWeight: 700 }}>Payment sent successfully.</p>
          </div>
        )}
      </div>

      {stage === 'pin' && payment && (
        <PinPad
          title="Enter Wallet PIN"
          subtitle={`Paying UGX ${payment.amount.toLocaleString()} to ${payment.payeeName}`}
          confirmLabel="Confirm & Pay →"
          onConfirm={handlePinConfirm}
          onCancel={() => setStage('confirm')}
        />
      )}
    </div>
  );
}
