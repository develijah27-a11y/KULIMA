'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', shadow: 'var(--d-shadow-card)',
};

const DISMISS_KEY = 'cropify-biometric-nudge-dismissed';

// A one-time dashboard nudge toward setting up biometric sign-in — the full
// management UI lives in PasskeySettings on the Settings page, but a
// feature nobody discovers doesn't get used. Renders nothing at all unless
// the device actually supports a platform authenticator AND the user has
// zero passkeys registered yet; disappears permanently (this device) once
// dismissed or once a passkey exists.
export function BiometricSetupBanner() {
  const [visible, setVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY)) return;
    (async () => {
      if (!window.PublicKeyCredential) return;
      let platformAvailable = false;
      try { platformAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { platformAvailable = false; }
      if (!platformAvailable) return;

      const supabase = createClient();
      const { data } = await supabase.auth.passkey.list();
      if (!data || data.length === 0) setVisible(true);
    })();
  }, []);

  function dismiss() {
    setVisible(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  async function setUp() {
    setRegistering(true);
    setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      dismiss();
    } catch (e: any) {
      const isCancel = e?.name === 'NotAllowedError' || /cancel|not allowed/i.test(e?.message ?? '');
      if (!isCancel) setError('Could not set this up on this device. Please try again, or use Settings later.');
    } finally {
      setRegistering(false);
    }
  }

  if (!visible) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      background: C.cardBg, borderRadius: 14, boxShadow: C.shadow, border: `1px solid ${C.border}`,
    }}>
      <span style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
        <Fingerprint size={22} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>Sign in faster with your fingerprint or face</p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          {error || 'No password to type next time — just your device\'s biometric unlock.'}
        </p>
      </div>
      <button
        onClick={setUp}
        disabled={registering}
        style={{
          padding: '8px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none',
          borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: registering ? 'not-allowed' : 'pointer',
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {registering ? <Loader2 size={13} className="animate-spin" /> : 'Set up'}
      </button>
      <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, flexShrink: 0, padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}
