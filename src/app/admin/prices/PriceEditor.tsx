'use client';

import { useState } from 'react';

const CROPS = [
  'maize', 'beans', 'groundnuts', 'sorghum', 'rice', 'cassava',
  'sweet_potatoes', 'banana', 'coffee', 'tomato', 'sunflower',
];

interface Props {
  districts: string[];
}

interface Entry {
  crop_type: string;
  price_per_kg: string;
  district: string;
  market_name: string;
}

const emptyEntry = (): Entry => ({ crop_type: 'maize', price_per_kg: '', district: 'Kampala', market_name: '' });

export function PriceEditor({ districts }: Props) {
  const [entries, setEntries] = useState<Entry[]>([emptyEntry()]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function updateEntry(i: number, field: keyof Entry, value: string) {
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function addRow() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function removeRow(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const payload = entries.map((en) => ({
      crop_type: en.crop_type,
      price_per_kg: parseFloat(en.price_per_kg),
      district: en.district,
      market_name: en.market_name || `${en.district} Market`,
    })).filter((en) => en.price_per_kg > 0);

    if (payload.length === 0) {
      setResult({ ok: false, msg: 'Enter at least one valid price' });
      setLoading(false);
      return;
    }

    const res = await fetch('/api/market-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok) {
      setResult({ ok: true, msg: `Uploaded ${json.inserted} price${json.inserted !== 1 ? 's' : ''} successfully` });
      setEntries([emptyEntry()]);
    } else {
      setResult({ ok: false, msg: json.error ?? 'Upload failed' });
    }
    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '8px',
    padding: '7px 10px', fontSize: '13px', color: '#1A1A1A', width: '100%',
    outline: 'none',
  };

  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>Add / Update Prices</p>
        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
          Upload current market prices by district
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px 20px' }}>
        {/* Column headers */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px',
            gap: '8px', marginBottom: '8px',
          }}
        >
          {['Crop', 'District', 'Market Name', 'Price UGX/kg', ''].map((h) => (
            <p key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </p>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px',
                gap: '8px', alignItems: 'center',
              }}
            >
              <select value={entry.crop_type} onChange={(e) => updateEntry(i, 'crop_type', e.target.value)} style={inputStyle}>
                {CROPS.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select value={entry.district} onChange={(e) => updateEntry(i, 'district', e.target.value)} style={inputStyle}>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                value={entry.market_name}
                onChange={(e) => updateEntry(i, 'market_name', e.target.value)}
                placeholder={`${entry.district} Market`}
                style={inputStyle}
              />
              <input
                value={entry.price_per_kg}
                onChange={(e) => updateEntry(i, 'price_per_kg', e.target.value)}
                type="number"
                min="1"
                placeholder="e.g. 650"
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={entries.length === 1}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: entries.length === 1 ? '#F3F4F6' : '#FEE2E2',
                  color: entries.length === 1 ? '#D1D5DB' : '#E63946',
                  border: 'none', cursor: entries.length === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={addRow}
            style={{
              padding: '7px 14px', background: '#F0FDF4', color: '#1B4332',
              border: '1.5px solid #BBF7D0', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add Row
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 20px', background: loading ? '#9CA3AF' : '#1B4332',
              color: '#FFFFFF', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Uploading…' : `Upload ${entries.length} Price${entries.length !== 1 ? 's' : ''}`}
          </button>
          {result && (
            <p
              style={{
                fontSize: '13px', fontWeight: 600,
                color: result.ok ? '#059669' : '#E63946',
              }}
            >
              {result.ok ? '✓' : '✗'} {result.msg}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
