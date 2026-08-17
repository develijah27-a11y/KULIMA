'use client';

import { useState, useCallback, useMemo, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Check, AlertTriangle } from 'lucide-react';

const GPSWalkMap = dynamic(() => import('./GPSWalkMap').then(m => m.GPSWalkMap), {
  ssr: false,
  loading: () => <div style={{ height: 300, background: 'var(--color-primary-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--color-primary-hover)', fontSize: 13, fontWeight: 600 }}>Loading map...</p></div>,
});

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','sweet_potatoes','sunflower','cotton'];
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi','Mityana','Nakaseke','Rakai','Lyantonde','Ntungamo','Isingiro','Kiruhura','Bushenyi'];

export function NewFarmForm() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [district, setDistrict] = useState('');
  const [sizeHa, setSizeHa]     = useState('');
  const [farmType, setFarmType] = useState('');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [boundary, setBoundary] = useState<[number, number][]>([]);
  const [areaHa, setAreaHa]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const onBoundaryChange = useCallback((coords: [number, number][], ha: number) => {
    setBoundary(coords);
    setAreaHa(ha);
    if (ha > 0) setSizeHa(ha.toFixed(2));
  }, []);

  const toggleCrop = useCallback((crop: string) => {
    setSelectedCrops(prev => prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Farm name is required'); return; }
    if (!district) { setError('Please select a district'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          district,
          location: district,
          size_hectares: sizeHa ? parseFloat(sizeHa) : null,
          farm_type: farmType || null,
          crop_types: selectedCrops.length > 0 ? selectedCrops : null,
          description: description || null,
          boundary: boundary.length >= 3 ? {
            type: 'Polygon',
            coordinates: [[...boundary.map(([lat, lng]) => [lng, lat]), [boundary[0][1], boundary[0][0]]]],
          } : null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        // /api/farms returns a structured error ({ message, fields }) for
        // validation failures, not a plain string like the rest of this
        // app's routes — throwing json.error directly here coerced that
        // object to the literal text "[object Object]" via Error's default
        // String() conversion, which is what the user actually saw instead
        // of the real validation message.
        const message = typeof json.error === 'string' ? json.error : json.error?.message;
        throw new Error(message || 'Failed to save farm');
      }
      router.push('/farmer/farm');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Name */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Farm Name *</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nakaseke North Plot"
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.text, background: 'var(--d-input-bg)' }}
        />
      </div>

      {/* District */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>District *</label>
        <select
          value={district} onChange={e => setDistrict(e.target.value)}
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', color: district ? C.text : C.muted, background: 'var(--d-input-bg)' }}
        >
          <option value="">Select district...</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Farm type + size */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Farm Type</label>
          <select
            value={farmType} onChange={e => setFarmType(e.target.value)}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: farmType ? C.text : C.muted, background: 'var(--d-input-bg)' }}
          >
            <option value="">Select type...</option>
            <option value="arable">Arable</option>
            <option value="mixed">Mixed</option>
            <option value="pastoral">Pastoral</option>
            <option value="horticulture">Horticulture</option>
            <option value="aquaculture">Aquaculture</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Size (ha){areaHa > 0 && <span style={{ color: 'var(--color-success)', fontSize: 11, marginLeft: 6 }}>from GPS walk</span>}
          </label>
          <input
            type="number" value={sizeHa} onChange={e => setSizeHa(e.target.value)} placeholder="e.g. 2.5" step="0.01" min="0"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${areaHa > 0 ? 'var(--color-primary-muted)' : C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: C.text, background: 'var(--d-input-bg)' }}
          />
        </div>
      </div>

      {/* Crops */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>Current Crops</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CROPS.map(crop => (
            <button
              key={crop} type="button" onClick={() => toggleCrop(crop)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${selectedCrops.includes(crop) ? C.green : C.border}`,
                background: selectedCrops.includes(crop) ? 'var(--color-primary-bg)' : 'var(--d-input-bg)',
                color: selectedCrops.includes(crop) ? C.green : C.muted,
                textTransform: 'capitalize',
              }}
            >
              {crop.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* GPS Walk Map */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>
          Farm Boundary
          {boundary.length < 3 && <span style={{ color: C.muted, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>(optional — walk your farm with GPS)</span>}
          {boundary.length >= 3 && <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 12, marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} />{boundary.length} points captured</span>}
        </label>
        <GPSWalkMap onBoundaryChange={onBoundaryChange} />
      </div>

      {/* Notes */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Notes <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Soil type, irrigation, notable features..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)' }}
        />
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', borderRadius: 10, border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-danger)', fontSize: 13 }}><AlertTriangle size={13} />{error}</div>
        </div>
      )}

      <button
        type="submit" disabled={loading}
        style={{ padding: '13px', background: loading ? 'var(--color-surface-2)' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Saving...' : 'Save Farm →'}
      </button>
    </form>
  );
}
