'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Snowflake, Lock } from 'lucide-react';

interface Props {
  userId: string;
  isFrozen: boolean;
}

export function FreezeWalletButton({ userId, isFrozen }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function apply(frozen: boolean, reasonText?: string) {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/wallets/freeze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, frozen, reason: reasonText }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed');
        setShowConfirm(false);
        setReason('');
        router.refresh();
      } catch (e: any) {
        setError(e.message ?? 'Failed to update wallet');
      }
    });
  }

  if (isFrozen) {
    return (
      <button
        onClick={() => apply(false)}
        disabled={isPending}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: 'var(--color-sky-bg)', color: 'var(--color-sky)', border: 'none', fontSize: 11, fontWeight: 700, cursor: isPending ? 'wait' : 'pointer', flexShrink: 0 }}
      >
        <Lock size={12} /> {isPending ? '...' : 'Unfreeze'}
      </button>
    );
  }

  if (showConfirm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }} onClick={e => e.stopPropagation()}>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (e.g. suspicious activity)"
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--d-border)', fontSize: 12, outline: 'none', background: 'var(--d-input-bg)', color: 'var(--d-text)' }}
        />
        {error && <p style={{ color: 'var(--color-danger)', fontSize: 10, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => apply(true, reason.trim() || undefined)}
            disabled={isPending}
            style={{ flex: 1, padding: '6px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
          >
            {isPending ? '...' : 'Confirm Freeze'}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setReason(''); setError(''); }}
            style={{ padding: '6px 10px', background: 'var(--color-surface-2)', color: 'var(--d-muted)', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
    >
      <Snowflake size={12} /> Freeze
    </button>
  );
}
