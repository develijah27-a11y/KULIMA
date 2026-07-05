'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

interface Props {
  remoteFee: number | null;
  visitFee: number | null;
  fullName: string;
  location: string;
  phoneNumber: string;
  primaryCrop: string;
}

export function RateSettings({ remoteFee, visitFee, fullName, location, phoneNumber, primaryCrop }: Props) {
  const router = useRouter();
  const [remote, setRemote] = useState(remoteFee ? String(remoteFee) : '');
  const [visit, setVisit]   = useState(visitFee ? String(visitFee) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [saved, setSaved]   = useState(false);

  async function save() {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName, location, phone_number: phoneNumber, primary_crop: primaryCrop,
          remote_fee_ugx: remote ? Number(remote) : null,
          visit_fee_ugx: visit ? Number(visit) : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to save');
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', padding: 20 }}>
      <p className="text-sm font-bold mb-2" style={{ color: C.text }}>Consultation Pricing</p>
      <p className="text-xs mb-4" style={{ color: C.muted }}>
        You decide what to charge. Farmers pay this from their in-app wallet — leave blank to use the platform default.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 5 }}>Remote consultation (UGX)</label>
          <input type="number" min="1" value={remote} onChange={e => setRemote(e.target.value)} placeholder="e.g. 15000"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 5 }}>Farm visit (UGX)</label>
          <input type="number" min="1" value={visit} onChange={e => setVisit(e.target.value)} placeholder="e.g. 50000"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>
      {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 10 }}>{error}</p>}
      {saved && <p style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 10 }}>Rates saved.</p>}
      <button onClick={save} disabled={saving}
        style={{ padding: '10px 18px', background: saving ? 'var(--color-surface-2)' : C.greenMed, color: saving ? C.muted : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving…' : 'Save Rates'}
      </button>
    </div>
  );
}
