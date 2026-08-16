'use client';

import { useState, useEffect, useCallback } from 'react';
import { Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { OtpInput } from '@/components/ui/OtpInput';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)',
};

const RESEND_COOLDOWN_SECONDS = 30;

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
  const [resending, setResending] = useState(false);
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorTick, setErrorTick] = useState(0);

  // Resend cooldown — 30s, prevents hammering the SMS send API (each send
  // also costs a real SMS credit, unlike the free email OTP resend).
  useEffect(() => {
    if (!codeSentAt) { setResendCooldown(0); return; }
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const id = setInterval(() => {
      setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [codeSentAt]);

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
      setCode('');
      setCodeSentAt(Date.now());
      setNotice(`Code sent to ${phone}. It expires in 10 minutes.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (resending || resendCooldown > 0) return;
    setResending(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/verify/phone/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not resend code.');
      setCode('');
      setCodeSentAt(Date.now());
      setNotice(`Code resent to ${phone}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  const confirmCode = useCallback(async (submittedCode: string) => {
    if (submittedCode.trim().length < 6 || loading) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/verify/phone/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: submittedCode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Incorrect code.');
      setStage('done');
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setErrorTick(t => t + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, onVerified]);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notice && <p style={{ fontSize: 12, color: 'var(--color-success)', margin: 0, textAlign: 'center' }}>{notice}</p>}

          <OtpInput
            length={6}
            value={code}
            onChange={setCode}
            onComplete={confirmCode}
            errorTick={errorTick}
            disabled={loading}
            textColor="var(--d-text)"
            boxBg="var(--d-input-bg, var(--color-surface))"
            emptyBorderColor="var(--d-border)"
          />

          <button type="button" onClick={() => confirmCode(code)}
            disabled={loading || code.length !== 6}
            style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'default' : 'pointer', opacity: code.length !== 6 ? 0.6 : 1 }}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <button type="button" onClick={() => { setStage('phone'); setError(''); setNotice(''); }} disabled={loading} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              Wrong number? Change it
            </button>
            <button type="button" onClick={resendCode} disabled={resending || resendCooldown > 0 || loading}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 700,
                color: resending || resendCooldown > 0 ? C.muted : C.green,
                cursor: resending || resendCooldown > 0 ? 'default' : 'pointer',
                textDecoration: resending || resendCooldown > 0 ? 'none' : 'underline' }}>
              {resending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '10px 0 0' }}>{error}</p>}
    </div>
  );
}
