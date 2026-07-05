'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function AccountNumberBadge({ accountNumber, dark = false }: { accountNumber: string | null | undefined; dark?: boolean }) {
  const [copied, setCopied] = useState(false);

  if (!accountNumber) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(accountNumber as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable — ignore */ }
  }

  const fg = dark ? 'rgba(255,255,255,0.85)' : 'var(--d-text)';
  const muted = dark ? 'rgba(255,255,255,0.55)' : 'var(--d-muted)';

  return (
    <button
      onClick={copy}
      type="button"
      title="Copy account number"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: dark ? 'rgba(255,255,255,0.12)' : 'var(--color-surface-2)',
        border: 'none', borderRadius: 10, padding: '6px 10px',
        cursor: 'pointer', marginTop: 4,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Account No.
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: fg, letterSpacing: '0.02em', fontFamily: 'var(--font-mono)' }}>
        {accountNumber}
      </span>
      {copied ? <Check size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} style={{ color: muted }} />}
    </button>
  );
}
