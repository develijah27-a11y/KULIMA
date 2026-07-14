'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';

const DOC_LABELS: Record<string, string> = {
  national_id_url: 'National ID',
  selfie_url: 'Selfie',
  business_reg_url: 'Business registration',
  driving_permit_url: 'Driving permit',
  vehicle_reg_url: 'Vehicle registration',
  qualifications_url: 'Qualifications',
};

// The kyc-documents bucket is private, so there's no permanent link to show
// here — each click mints fresh 5-minute signed URLs and opens them.
export function ViewDocsButton({ verificationId }: { verificationId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function view() {
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kyc-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { urls } = await res.json();
      const keys = Object.keys(urls ?? {});
      if (!keys.length) { setErr('No documents on file'); return; }
      keys.forEach(k => window.open(urls[k], '_blank', 'noopener,noreferrer'));
    } catch {
      setErr('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={view}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--color-surface-2)', color: 'var(--d-text)', border: '1px solid var(--d-border)', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
      >
        <FileText size={13} /> {loading ? 'Opening…' : 'View documents'}
      </button>
      {err && <p style={{ color: 'var(--color-danger)', fontSize: 11, margin: 0 }}>{err}</p>}
    </div>
  );
}
