'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', green: 'var(--color-primary)',
};

const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi','Mityana','Nakaseke','Rakai','Lyantonde','Ntungamo','Isingiro','Kiruhura','Bushenyi'];

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  capacity_kg: number;
  make_model: string | null;
  year: number | null;
  districts: string[] | null;
  is_available: boolean;
}

interface Props { existing: Vehicle | null; }

export function VehicleForm({ existing }: Props) {
  const router = useRouter();
  const [plate, setPlate]         = useState(existing?.plate_number ?? '');
  const [type, setType]           = useState(existing?.vehicle_type ?? '');
  const [capacity, setCapacity]   = useState(existing?.capacity_kg?.toString() ?? '');
  const [makeModel, setMakeModel] = useState(existing?.make_model ?? '');
  const [year, setYear]           = useState(existing?.year?.toString() ?? '');
  const [availDist, setAvailDist] = useState<string[]>(existing?.districts ?? []);
  const [isAvailable, setIsAvailable]     = useState(existing?.is_available ?? true);
  const [isColdCapable, setIsColdCapable] = useState((existing as any)?.is_cold_capable ?? false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  function toggleDistrict(d: string) {
    setAvailDist(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!plate.trim()) { setError('Plate number required'); return; }
    if (!type)         { setError('Vehicle type required'); return; }
    if (!capacity || parseFloat(capacity) <= 0) { setError('Capacity required'); return; }

    setLoading(true); setError('');
    try {
      const body = {
        plate_number: plate.trim().toUpperCase(),
        vehicle_type: type,
        capacity_kg: parseFloat(capacity),
        make_model: makeModel || null,
        year: year ? parseInt(year) : null,
        districts: availDist.length > 0 ? availDist : null,
        is_available: isAvailable,
        is_cold_capable: isColdCapable,
        ...(existing ? { id: existing.id } : {}),
      };
      const res  = await fetch('/api/vehicles', { method: existing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed');
      router.push('/transporter/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Plate Number *</label>
          <input type="text" value={plate} onChange={e => setPlate(e.target.value)} placeholder="e.g. UAB 123X"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Vehicle Type *</label>
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: type ? C.text : C.muted, background: 'var(--d-input-bg)' }}>
            <option value="">Select...</option>
            <option value="motorcycle">Motorcycle (Boda)</option>
            <option value="pickup">Pickup Truck</option>
            <option value="minivan">Minivan</option>
            <option value="truck">Truck</option>
            <option value="lorry">Lorry</option>
            <option value="tractor">Tractor</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Capacity (kg) *</label>
          <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. 1000" min="1"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Year</label>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2018" min="1990" max={new Date().getFullYear()}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Make & Model</label>
        <input type="text" value={makeModel} onChange={e => setMakeModel(e.target.value)} placeholder="e.g. Toyota Hilux"
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>
          Operating Districts <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>(select all that apply)</span>
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DISTRICTS.map(d => (
            <button key={d} type="button" onClick={() => toggleDistrict(d)}
              style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${availDist.includes(d) ? C.green : C.border}`, background: availDist.includes(d) ? 'var(--color-primary-bg)' : 'var(--d-input-bg)', color: availDist.includes(d) ? C.green : C.muted }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="available" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: C.green }} />
          <label htmlFor="available" style={{ fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
            Available for deliveries
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" id="cold_capable" checked={isColdCapable} onChange={e => setIsColdCapable(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 1, accentColor: '#0EA5E9' }} />
          <label htmlFor="cold_capable" style={{ fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer', lineHeight: 1.4 }}>
            Cold chain capable <span style={{ fontWeight: 400, fontSize: 11, color: C.muted }}>(refrigerated — can carry perishables)</span>
          </label>
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}

      <button type="submit" disabled={loading}
        style={{ padding: '13px', background: loading ? 'var(--color-surface-2)' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Saving...' : existing ? 'Update Vehicle' : 'Register Vehicle →'}
      </button>
    </form>
  );
}
