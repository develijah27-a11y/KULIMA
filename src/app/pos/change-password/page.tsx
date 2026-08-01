'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)',
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pos/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update password');
      router.push('/pos/till');
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 16px', fontFamily: "'Poppins','Inter',system-ui,sans-serif" }}>
      <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, padding: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--color-primary-bg)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <KeyRound size={22} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Set your password</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 22px', lineHeight: 1.5 }}>
          Your store owner gave you a temporary password. Choose your own before using the till.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: 'var(--d-input-bg)', outline: 'none' }}
          />
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: 'var(--d-input-bg)', outline: 'none' }}
          />
          {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0, fontWeight: 600 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '13px', borderRadius: 12, border: 'none', background: loading ? C.border : C.green, color: '#fff', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Continue to till'}
          </button>
        </form>
      </div>
    </div>
  );
}
