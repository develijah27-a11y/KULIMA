'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)' };
const CONFIRM_WORD = 'DELETE';

// Irreversible, so this asks for a typed confirmation word rather than just
// a click-through modal. The backend (/api/auth/delete-account) hard-deletes
// the account outright when nothing else references it; if the account has
// real order/delivery/dispute/rating history, it instead deactivates sign-in
// and scrubs personal info while keeping a depersonalized row so other
// users' own transaction records still resolve. No undo either way.
export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Failed to delete your account. Please try again.');
      window.location.href = '/auth/signin?reason=account_deleted';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', width: '100%', textAlign: 'left', background: 'var(--d-card)', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={20} style={{ color: 'var(--color-danger)' }} />
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 1 }}>Delete Account</p>
          <p style={{ fontSize: 12, color: C.muted }}>Permanently delete your account and all its data</p>
        </div>
        <span style={{ color: C.muted, fontSize: 16 }}>›</span>
      </button>

      {open && (
        <div
          role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--d-card)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
              <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>Delete your account?</p>
            </div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: '0 0 16px' }}>
              This permanently disables sign-in and removes your personal info — name, phone, photo, location. If you have order, delivery, or dispute history, those records are anonymized and kept rather than deleted, since other users' own transaction history depends on them. This cannot be undone.
            </p>
            <p style={{ fontSize: 12.5, color: C.text, fontWeight: 600, margin: '0 0 6px' }}>
              Type <span style={{ fontFamily: 'monospace', color: 'var(--color-danger)' }}>{CONFIRM_WORD}</span> to confirm
            </p>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoFocus
              disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--d-border)', background: 'var(--d-input-bg, var(--color-surface))', color: 'var(--d-text)', fontSize: 14, marginBottom: 14 }}
            />
            {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 12px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid var(--d-border)', background: 'transparent', color: C.text, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== CONFIRM_WORD}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                  background: 'var(--color-danger)', color: '#fff', fontWeight: 800, fontSize: 13.5,
                  cursor: (loading || confirmText !== CONFIRM_WORD) ? 'not-allowed' : 'pointer',
                  opacity: confirmText !== CONFIRM_WORD ? 0.5 : 1,
                }}
              >
                {loading ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
