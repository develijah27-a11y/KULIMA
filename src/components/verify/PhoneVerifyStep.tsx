'use client';

import { useState } from 'react';
import { Phone, ShieldCheck, Loader2 } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)',
};

interface Props {
  initialPhone: string | null;
  onVerified?: () => void;
}

// The "Phone" step of the verification stepper (see VerifyPageContent.tsx —
// the LEVELS/'grey' step is labelled "Phone" but nothing ever actually
// verified one before this). Two-stage form: enter/confirm number, then the
// 6-digit code sent to it. Codes are single-use and expire in 10 minutes
// (see /api/verify/phone/send) — deliberately short, same reasoning as the
// password-reset link.
export function PhoneVerifyStep({ initialPhone, onVerified }: Props) {
  const [stage, setStage] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/verify/phone/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not send code.');
      setStage('code');
      setNotice(`Code sent to ${phone}. It expires in 10 minutes.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/verify/phone/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Incorrect code.');
      setStage('done');
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'done') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
        <ShieldCheck size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>Phone number verified.</p>
      </div>
    );
  }

  return (
    <div style={{ background: C.cardBg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Phone size={16} style={{ color: C.green }} />
        <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>Verify your phone number</p>
      </div>
      <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px' }}>
        Needed so group admins can find you by phone when they add you to a farming group.
      </p>

      {stage === 'phone' ? (
        <form onSubmit={sendCode} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="0701234567" required disabled={loading}
            style={{ flex: '1 1 180px', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13.5 }}
          />
          <button type="submit" disabled={loading} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : null} Send code
          </button>
        </form>
      ) : (
        <form onSubmit={confirmCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notice && <p style={{ fontSize: 12, color: 'var(--color-success)', margin: 0 }}>{notice}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text" inputMode="numeric" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code" required disabled={loading}
              style={{ flex: '1 1 140px', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 15, letterSpacing: '0.15em', fontFamily: 'monospace' }}
            />
            <button type="submit" disabled={loading || code.length !== 6} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'default' : 'pointer', opacity: code.length !== 6 ? 0.6 : 1 }}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          <button type="button" onClick={() => { setStage('phone'); setError(''); setNotice(''); }} disabled={loading} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            Wrong number? Change it
          </button>
        </form>
      )}

      {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '10px 0 0' }}>{error}</p>}
    </div>
  );
}
