'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', green: '#1B4332',
};

const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi','Mityana','Nakaseke','Rakai','Lyantonde','Ntungamo','Isingiro','Kiruhura','Bushenyi'];

interface Props {
  prefilledOffer: { id: string; crop_type: string; quantity_kg: number; district: string } | null;
}

export function RequestDeliveryForm({ prefilledOffer }: Props) {
  const router = useRouter();
  const [pickupDistrict, setPickupDistrict] = useState(prefilledOffer?.district ?? '');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffDistrict, setDropoffDistrict] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cargoKg, setCargoKg]       = useState(prefilledOffer?.quantity_kg?.toString() ?? '');
  const [cargoType, setCargoType]   = useState(prefilledOffer?.crop_type ?? '');
  const [pickupDate, setPickupDate] = useState('');
  const [notes, setNotes]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pickupDistrict || !dropoffDistrict || !cargoKg || !pickupDate) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: prefilledOffer?.id ?? null,
          pickup_district: pickupDistrict,
          pickup_location: pickupLocation || pickupDistrict,
          dropoff_district: dropoffDistrict,
          dropoff_location: dropoffLocation || dropoffDistrict,
          cargo_kg: parseFloat(cargoKg),
          cargo_type: cargoType || null,
          pickup_date: pickupDate,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed');
      router.push('/buyer/offers');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {prefilledOffer && (
        <div style={{ padding: '12px 14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #A7F3D0' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', margin: 0 }}>
            ✓ Linked to accepted deal: {prefilledOffer.crop_type} · {prefilledOffer.quantity_kg} kg
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Pickup District *</label>
          <select value={pickupDistrict} onChange={e => setPickupDistrict(e.target.value)}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: pickupDistrict ? C.text : C.muted, background: '#fff' }}>
            <option value="">Select...</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Dropoff District *</label>
          <select value={dropoffDistrict} onChange={e => setDropoffDistrict(e.target.value)}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: dropoffDistrict ? C.text : C.muted, background: '#fff' }}>
            <option value="">Select...</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Pickup Location</label>
          <input type="text" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="Village, road, landmark..."
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Dropoff Location</label>
          <input type="text" value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} placeholder="Market, warehouse, address..."
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Cargo (kg) *</label>
          <input type="number" value={cargoKg} onChange={e => setCargoKg(e.target.value)} placeholder="e.g. 500" min="1"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Cargo Type</label>
          <input type="text" value={cargoType} onChange={e => setCargoType(e.target.value)} placeholder="e.g. Maize, Coffee bags"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Pickup Date *</label>
        <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Notes <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Access instructions, bagging requirements..."
          rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>

      {error && <p style={{ color: '#DC2626', fontSize: 13 }}>⚠ {error}</p>}

      <button type="submit" disabled={loading}
        style={{ padding: '13px', background: loading ? '#E5E7EB' : C.green, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Posting...' : 'Post Delivery Request →'}
      </button>
    </form>
  );
}
