'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton','vanilla','cocoa'];
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi','Busia','Kasese'];

export default function NewContractPage() {
  const router = useRouter();
  const [cropType, setCropType] = useState('');
  const [district, setDistrict] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [priceUgx, setPriceUgx] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cropType) { setError('Select a crop type'); return; }
    if (!district) { setError('Select a district'); return; }
    if (!quantityKg || isNaN(Number(quantityKg)) || Number(quantityKg) <= 0) { setError('Enter a valid quantity'); return; }
    if (!priceUgx || isNaN(Number(priceUgx)) || Number(priceUgx) <= 0) { setError('Enter a valid price per kg'); return; }
    if (!deliveryDate) { setError('Set a delivery date'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/offtaker-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop_type: cropType, district, quantity_kg: Number(quantityKg), price_ugx: Number(priceUgx), delivery_date: deliveryDate, farmer_name: farmerName || null, notes: notes || null }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to create contract');
      router.push('/offtaker/contracts');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalValue = Number(quantityKg) && Number(priceUgx) ? Number(quantityKg) * Number(priceUgx) : 0;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/offtaker/pipeline" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Find Farmers</Link>
      </div>
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>New Contract</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Create a forward contract with a farmer supplier</p>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Crop Type *</label>
            <select value={cropType} onChange={e => setCropType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: cropType ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}>
              <option value="">Select crop...</option>
              {CROPS.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
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
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Quantity (kg) *</label>
            <input type="number" value={quantityKg} onChange={e => setQuantityKg(e.target.value)} min="1" placeholder="e.g. 5000" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Price / kg (UGX) *</label>
            <input type="number" value={priceUgx} onChange={e => setPriceUgx(e.target.value)} min="1" placeholder="e.g. 1200" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {totalValue > 0 && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--color-sky-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.blue, margin: 0 }}>Total Contract Value</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: C.blue, margin: 0, letterSpacing: '-0.02em' }}>UGX {totalValue.toLocaleString()}</p>
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Delivery Date *</label>
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: deliveryDate ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Farmer / Supplier Name <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <input value={farmerName} onChange={e => setFarmerName(e.target.value)} placeholder="e.g. Okello Cooperative" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Contract Notes <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Grade requirements, packaging, transport, etc..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '12px', background: loading ? 'var(--color-surface-2)' : C.blue, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Creating...' : 'Create Contract →'}
        </button>
      </form>
    </div>
  );
}
