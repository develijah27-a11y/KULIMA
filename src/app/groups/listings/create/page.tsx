'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', greenMed: 'var(--color-primary-hover)',
};

const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton'];
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi'];

export default function CreateGroupListingPage() {
  const router = useRouter();
  const [cropType, setCropType] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [district, setDistrict] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cropType) { setError('Select a crop'); return; }
    if (!quantityKg || Number(quantityKg) <= 0) { setError('Enter a valid quantity'); return; }
    if (!askingPrice || Number(askingPrice) <= 0) { setError('Enter a price per kg'); return; }
    if (!district) { setError('Select a district'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/group-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop_type: cropType, total_quantity_kg: Number(quantityKg), asking_price: Number(askingPrice), district, notes: notes || null }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to create listing');
      router.push('/groups/listings');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/groups/listings" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Group Listings</Link>
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>Create Group Listing</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Pool your members' produce to sell as a consolidated lot</p>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Crop *</label>
            <select value={cropType} onChange={e => setCropType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: cropType ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}>
              <option value="">Select crop...</option>
              {CROPS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>District *</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: district ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}>
              <option value="">Select district...</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Total Group Quantity (kg) *</label>
            <input type="number" value={quantityKg} onChange={e => setQuantityKg(e.target.value)} min="1" placeholder="e.g. 2000" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Asking Price / kg (UGX) *</label>
            <input type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)} min="1" placeholder="e.g. 1400" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Notes <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Grade, drying status, packaging available, pickup point..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '12px', background: loading ? 'var(--color-surface-2)' : C.greenMed, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Publishing...' : 'Publish Listing →'}
        </button>
      </form>
    </div>
  );
}
