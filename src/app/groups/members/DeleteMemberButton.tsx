'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function DeleteMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove "${memberName}" from your group? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/group-members/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleted(true);
        // Re-run the page's Server Component fetch so the member row and
        // every count derived from it (header "N members", "Members (N)"
        // section label) update immediately, without a manual refresh.
        router.refresh();
      } else {
        const json = await res.json();
        alert(json.error ?? 'Failed to remove member');
      }
    } catch {
      alert('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  if (deleted) return null;

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Remove member"
      style={{
        background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        color: loading ? 'var(--d-muted)' : 'var(--color-danger)',
        padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Trash2 size={15} />
    </button>
  );
}
