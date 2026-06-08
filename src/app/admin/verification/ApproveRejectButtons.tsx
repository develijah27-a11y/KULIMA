'use client';

import { useState, useTransition } from 'react';

interface Props {
  verificationId: string;
  userId: string;
  targetLevel: string;
}

async function reviewVerification(
  verificationId: string,
  userId: string,
  targetLevel: string,
  action: 'approve' | 'reject',
  reason?: string,
) {
  const res = await fetch('/api/admin/verify-kyc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationId, userId, targetLevel, action, reason }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function ApproveRejectButtons({ verificationId, userId, targetLevel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason]         = useState('');
  const [done, setDone]             = useState('');
  const [err, setErr]               = useState('');

  if (done) {
    return (
      <span style={{ fontSize: 12, fontWeight: 700, color: done === 'approved' ? '#059669' : '#DC2626' }}>
        {done === 'approved' ? '✓ Approved' : '✗ Rejected'}
      </span>
    );
  }

  function act(action: 'approve' | 'reject', rej?: string) {
    setErr('');
    startTransition(async () => {
      try {
        await reviewVerification(verificationId, userId, targetLevel, action, rej);
        setDone(action === 'approve' ? 'approved' : 'rejected');
      } catch (e: any) {
        setErr(e.message ?? 'Failed');
      }
    });
  }

  if (showReject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection..."
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }}
        />
        {err && <p style={{ color: '#DC2626', fontSize: 11 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => reason.trim() && act('reject', reason)}
            disabled={isPending || !reason.trim()}
            style={{ flex: 1, padding: '7px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: reason.trim() ? 'pointer' : 'not-allowed' }}
          >
            {isPending ? '...' : 'Confirm Reject'}
          </button>
          <button
            onClick={() => { setShowReject(false); setReason(''); }}
            style={{ padding: '7px 12px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      {err && <p style={{ color: '#DC2626', fontSize: 11 }}>{err}</p>}
      <button
        onClick={() => act('approve')}
        disabled={isPending}
        style={{ padding: '7px 16px', background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
      >
        {isPending ? '...' : 'Approve'}
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={isPending}
        style={{ padding: '7px 16px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
      >
        Reject
      </button>
    </div>
  );
}
