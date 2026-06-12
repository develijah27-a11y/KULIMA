'use client';

import { useState } from 'react';

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/delete-account', { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to delete account');
      window.location.replace('/');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--d-border)' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 4 }}>
          This cannot be undone.
        </p>
        <p style={{ fontSize: 12, color: 'var(--d-muted)', marginBottom: 12 }}>
          All your farms, listings, and data will be permanently deleted.
        </p>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 10 }}>{error}</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 8, background: 'var(--color-danger)',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Yes, delete my account'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(''); }}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 8, background: 'var(--d-input-bg)',
              color: 'var(--d-text)', border: '1px solid var(--d-border)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px', width: '100%', textAlign: 'left',
        background: 'var(--d-card)', border: 'none', cursor: 'pointer',
        borderTop: '1px solid var(--d-border)',
      }}
    >
      <span style={{ fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 }}>🗑️</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 1 }}>
          Delete Account
        </p>
        <p style={{ fontSize: 12, color: 'var(--d-muted)' }}>
          Permanently remove your account and all data
        </p>
      </div>
      <span style={{ color: 'var(--d-muted)', fontSize: 16 }}>›</span>
    </button>
  );
}
