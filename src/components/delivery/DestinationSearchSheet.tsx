'use client';

import { useMemo, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Search, MapPin, Clock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (district: string) => void;
  title: string;
  districts: string[];
  /** Most-recently-used districts for this field, newest first — shown above the full list. */
  recent?: string[];
}

// The "Where to?" search sheet — same searchable-list pattern for both
// pickup and drop-off district selection, replacing the plain <select>
// dropdowns with something closer to the ride-hailing search bar the map
// screen imitates. Districts are still the only geocoding this app has (no
// address-level search), so this searches district names, not addresses.
export function DestinationSearchSheet({ open, onClose, onSelect, title, districts, recent }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return districts;
    return districts.filter(d => d.toLowerCase().includes(q));
  }, [query, districts]);

  function pick(d: string) {
    onSelect(d);
    setQuery('');
  }

  return (
    <BottomSheet open={open} onClose={() => { setQuery(''); onClose(); }} title={title}>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--d-muted, #6b7566)' }} />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search district…"
          style={{
            width: '100%', padding: '11px 13px 11px 36px', borderRadius: 10,
            border: '1px solid var(--d-border, #e4e8e1)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {!query && recent && recent.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted, #6b7566)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
            Recent
          </p>
          {recent.map(d => (
            <button key={`recent-${d}`} type="button" onClick={() => pick(d)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 4px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <Clock size={15} style={{ color: 'var(--d-muted, #6b7566)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text, #182018)' }}>{d}</span>
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--d-border, #e4e8e1)', margin: '6px 0 0' }} />
        </div>
      )}

      <div style={{ maxHeight: '42vh', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--d-muted, #6b7566)', textAlign: 'center', padding: '20px 0' }}>
            No districts match &ldquo;{query}&rdquo;
          </p>
        ) : filtered.map(d => (
          <button key={d} type="button" onClick={() => pick(d)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 4px',
              background: 'transparent', border: 'none', borderBottom: '1px solid var(--d-border, #e4e8e1)',
              cursor: 'pointer', textAlign: 'left',
            }}>
            <MapPin size={15} style={{ color: 'var(--color-primary, #166B3A)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text, #182018)' }}>{d}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
