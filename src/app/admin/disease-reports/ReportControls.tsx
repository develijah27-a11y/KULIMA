'use client';

import { useState, useTransition, useEffect } from 'react';
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

  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  useEffect(() => {
    setLocalPathologist(pathologistId ?? '');
  }, [pathologistId]);

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
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select
        value={localStatus}
        disabled={pending}
        onChange={e => {
          const val = e.target.value;
          setLocalStatus(val);
          update({ status: val });
        }}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--d-border)', fontSize: 12, fontWeight: 600, color: 'var(--d-text)', background: 'var(--d-input-bg)', cursor: 'pointer' }}
      >
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
      </select>
      <select
        value={localPathologist}
        disabled={pending}
        onChange={e => {
          const val = e.target.value;
          setLocalPathologist(val);
          const nextStatus = val && localStatus === 'reported' ? 'assigned' : localStatus;
          if (val && localStatus === 'reported') setLocalStatus('assigned');
          update({ pathologistId: val || null, status: nextStatus });
        }}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--d-border)', fontSize: 12, fontWeight: 600, color: 'var(--d-text)', background: 'var(--d-input-bg)', cursor: 'pointer' }}
      >
        <option value="">Unassigned</option>
        {localPathologist && !pathologists.some(p => p.id === localPathologist) && (
          <option value={localPathologist}>Assigned Pathologist</option>
        )}
        {pathologists.map(p => <option key={p.id} value={p.id}>{p.full_name ?? 'Pathologist'}</option>)}
      </select>
      {pending && <span style={{ fontSize: 11, color: 'var(--d-muted)' }}>Saving…</span>}
    </div>
  );
}
