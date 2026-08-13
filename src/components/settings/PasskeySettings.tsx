'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Trash2, Loader2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)',
};

interface PasskeyItem {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

function deviceLabel(item: PasskeyItem): string {
  if (item.friendly_name) return item.friendly_name;
  return `Passkey added ${new Date(item.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// Biometric/device-passcode sign-in via WebAuthn passkeys. Not shown at all
// on a browser/device with no platform authenticator support — offering a
// button that would just fail isn't better than not offering it.
export function PasskeySettings() {
  const [supported, setSupported] = useState(false);
  const [checkedSupport, setCheckedSupport] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasApi = typeof window !== 'undefined' && !!window.PublicKeyCredential;
      let platformAvailable = false;
      try {
        platformAvailable = hasApi && await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        platformAvailable = false;
      }
      if (!cancelled) {
        setSupported(hasApi && platformAvailable);
        setCheckedSupport(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (supported) refresh();
    else setLoading(false);
  }, [supported]);

  async function refresh() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.passkey.list();
    setPasskeys(data ?? []);
    setLoading(false);
  }

  async function handleRegister() {
    setRegistering(true);
    setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      // A cancelled biometric prompt surfaces as a WebAuthn NotAllowedError —
      // that's a normal "changed my mind," not a failure worth alarming over.
      const isCancel = e?.name === 'NotAllowedError' || /cancel|not allowed/i.test(e?.message ?? '');
      setError(isCancel ? '' : (e?.message ?? 'Could not add a passkey on this device. Please try again.'));
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(passkeyId: string) {
    setDeletingId(passkeyId);
    try {
      const supabase = createClient();
      await supabase.auth.passkey.delete({ passkeyId });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (!checkedSupport) return null;
  if (!supported) return null;

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Security
      </p>
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
              <Fingerprint size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 1 }}>Biometric &amp; device sign-in</p>
              <p style={{ fontSize: 12, color: C.muted }}>
                Use your fingerprint, face, or device passcode instead of typing your password on this device.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
            <Loader2 size={14} className="animate-spin" /> Checking your devices…
          </div>
        ) : (
          <>
            {passkeys.map(pk => (
              <div key={pk.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ width: 36, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deviceLabel(pk)}
                  </p>
                  {pk.last_used_at && (
                    <p style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                      Last used {new Date(pk.last_used_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(pk.id)}
                  disabled={deletingId === pk.id}
                  aria-label={`Remove ${deviceLabel(pk)}`}
                  style={{ background: 'none', border: 'none', cursor: deletingId === pk.id ? 'not-allowed' : 'pointer', color: 'var(--color-danger)', flexShrink: 0, padding: 4 }}
                >
                  {deletingId === pk.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            ))}

            <button
              onClick={handleRegister}
              disabled={registering}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', width: '100%',
                textAlign: 'left', background: 'transparent', border: 'none',
                cursor: registering ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                {registering ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </span>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>
                {registering ? 'Follow the prompt on your device…' : passkeys.length > 0 ? 'Add another device' : 'Set up biometric sign-in'}
              </p>
            </button>

            {error && (
              <p style={{ fontSize: 12, color: 'var(--color-danger)', padding: '0 20px 14px', margin: 0 }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
