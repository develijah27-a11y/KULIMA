'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

interface Props {
  districts: string[];
  homeDistrict: string;
  initialSelected: string[];
}

export function CoverageDistrictsEditor({ districts, homeDistrict, initialSelected }: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function toggle(d: string) {
    setSaved(false);
    setSelected(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/supplier/coverage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districts: selected }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setSaved(true);
    } catch {
      setError('Failed to save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...initialSelected].sort());

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {districts.filter(d => d !== homeDistrict).map(d => {
          const on = selected.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${on ? C.green : C.border}`,
                background: on ? 'var(--color-primary-bg)' : 'transparent',
                color: on ? C.greenMed : C.muted,
              }}
            >
              {on && <Check size={12} />} {d}
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 10px' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: dirty ? C.green : 'var(--color-surface-2)',
            color: dirty ? '#fff' : C.muted,
            fontSize: 13, fontWeight: 700,
            cursor: dirty && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Saving…' : 'Save coverage area'}
        </button>
        {saved && !dirty && (
          <span style={{ fontSize: 12, color: C.green, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Check size={14} /> Saved — {selected.length === 0 ? 'home district only' : `${selected.length + 1} district${selected.length > 0 ? 's' : ''} total`}
          </span>
        )}
      </div>
    </div>
  );
}
