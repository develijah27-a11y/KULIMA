'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QrCode, X, RefreshCw } from 'lucide-react';

interface Props {
  deliveryId: string;
  amount: number;
}

const TTL_MS = 3 * 60 * 1000;

// Payee side of the "pay nearby" flow — shown on a delivered-but-unpaid
// job. Generates a fresh signed token the instant the sheet opens (never
// pre-generated/always-on, so a stale QR can't sit around waiting to be
// screenshotted) and auto-regenerates on expiry.
export function ShowPaymentQR({ deliveryId, amount }: Props) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(TTL_MS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/qr-token`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not generate QR code');

      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(json.token, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220,
        color: { dark: '#123825', light: '#FFFFFF' },
      });
      setDataUrl(url);
      setExpiresAt(new Date(json.expiresAt).getTime());
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    if (!open) return;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !expiresAt) return;
    tickRef.current = setInterval(() => {
      const left = expiresAt - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        generate();
      }
    }, 500);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [open, expiresAt, generate]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
          border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        <QrCode size={12} /> Show QR to collect
      </button>
    );
  }

  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, padding: '24px 24px 20px', width: '100%', maxWidth: 320, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>Payment QR</p>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 22, fontWeight: 900, color: '#15803d', margin: '4px 0 16px' }}>
          UGX {amount.toLocaleString()}
        </p>

        <div style={{
          width: 220, height: 220, margin: '0 auto', borderRadius: 14, background: '#f9fafb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {loading ? (
            <RefreshCw size={28} style={{ color: '#9ca3af' }} className="animate-spin" />
          ) : dataUrl ? (
            <img src={dataUrl} alt="Payment QR code" width={220} height={220} />
          ) : null}
        </div>

        {error && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>{error}</p>}

        {!error && !loading && dataUrl && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
            {secondsLeft > 0 ? `Refreshes in ${secondsLeft}s` : 'Refreshing…'}
          </p>
        )}
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
          Ask the person paying you to scan this. It updates automatically.
        </p>
      </div>
    </div>
  );
}
