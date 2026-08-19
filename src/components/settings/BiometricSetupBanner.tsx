'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', shadow: 'var(--d-shadow-card)',
};

const DISMISS_KEY = 'cropify-biometric-nudge-dismissed';
const CONFIGURED_KEY = 'cropify-biometric-configured';

// A one-time dashboard nudge toward setting up biometric sign-in.
// Renders nothing at all if:
// 1. Device lacks platform authenticator support.
// 2. User has already enrolled biometric/passkey on this device (persisted in localStorage or Supabase).
// 3. User previously dismissed the banner on this device.
export function BiometricSetupBanner() {
  const [visible, setVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check permanent localStorage flags first
    try {
      if (localStorage.getItem(CONFIGURED_KEY) === 'true') return;
      if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    } catch {
      // Ignore localStorage read errors
    }

    (async () => {
      if (!window.PublicKeyCredential) return;
      let platformAvailable = false;
      try {
        platformAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        platformAvailable = false;
      }
      if (!platformAvailable) return;

      try {
        const supabase = createClient();
        // Check Supabase MFA WebAuthn factors
        const { data: factorData } = await supabase.auth.mfa.listFactors();
        const hasWebAuthn = factorData?.all?.some(f => f.factor_type === 'webauthn' && f.status === 'verified');
        if (hasWebAuthn) {
          try { localStorage.setItem(CONFIGURED_KEY, 'true'); } catch {}
          return;
        }
        setVisible(true);
      } catch {
        setVisible(true);
      }
    })();
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch { /* ignore */ }
  }

  async function setUp() {
    setRegistering(true);
    setError('');
    try {
      const supabase = createClient();
      let registered = false;

      // 1. Try Supabase WebAuthn MFA registration first
      try {
        if (supabase.auth?.mfa?.webauthn?.register) {
          const res = await supabase.auth.mfa.webauthn.register({
            friendlyName: `Biometric (${new Date().toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })})`,
          });
          if (!res?.error && res?.data) {
            registered = true;
          }
        }
      } catch {
        // Fallback to direct WebAuthn
      }

      // 2. Native WebAuthn platform authenticator (TouchID / FaceID / Windows Hello / Android Biometrics)
      if (!registered && window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Cropify', id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname },
            user: {
              id: userId,
              name: 'user@cropifyapp.com',
              displayName: 'Cropify User',
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },   // ES256
              { alg: -257, type: 'public-key' },  // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'preferred',
              requireResidentKey: false,
            },
            timeout: 60000,
          },
        });

        if (credential) {
          registered = true;
        }
      }

      // Save configured flag permanently on this device
      try {
        localStorage.setItem(CONFIGURED_KEY, 'true');
      } catch {}
      setVisible(false);
    } catch (e: any) {
      const isCancel = e?.name === 'NotAllowedError' || /cancel|not allowed/i.test(e?.message ?? '');
      if (!isCancel) {
        setError('Biometric sensor cancelled or unavailable. You can manage devices in Settings.');
      }
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
