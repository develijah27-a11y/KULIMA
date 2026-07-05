'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = ['reported', 'assigned', 'diagnosed', 'closed'];

interface Pathologist { id: string; full_name: string | null; }

export function ReportControls({ reportId, status, pathologistId, pathologists }: {
  reportId: string;
  status: string;
  pathologistId: string | null;
  pathologists: Pathologist[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);
  const [localPathologist, setLocalPathologist] = useState(pathologistId ?? '');

  function update(body: Record<string, unknown>) {
    start(async () => {
      await fetch(`/api/admin/disease-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select
        value={localStatus}
        disabled={pending}
        onChange={e => { setLocalStatus(e.target.value); update({ status: e.target.value }); }}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--d-border)', fontSize: 12, fontWeight: 600, color: 'var(--d-text)', background: 'var(--d-input-bg)' }}
      >
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
      </select>
      <select
        value={localPathologist}
        disabled={pending}
        onChange={e => { setLocalPathologist(e.target.value); update({ pathologistId: e.target.value || null }); }}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--d-border)', fontSize: 12, fontWeight: 600, color: 'var(--d-text)', background: 'var(--d-input-bg)' }}
      >
        <option value="">Unassigned</option>
        {pathologists.map(p => <option key={p.id} value={p.id}>{p.full_name ?? 'Pathologist'}</option>)}
      </select>
    </div>
  );
}
