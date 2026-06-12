'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', red: 'var(--color-danger)', green: 'var(--color-primary)',
};

const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton'];
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi'];

export default function NewCasePage() {
  const router = useRouter();
  const [cropType, setCropType] = useState('');
  const [district, setDistrict] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cropType) { setError('Please select a crop type'); return; }
    if (!district) { setError('Please select a district'); return; }
    if (!symptoms.trim()) { setError('Please describe the symptoms'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/disease-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop_type: cropType, district, symptoms, urgency, diagnosis: diagnosis || null, treatment: treatment || null, farmer_name: farmerName || null }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to file report');
      router.push('/pathologist/my-cases');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/pathologist/my-cases" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← My Cases</Link>
      </div>
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>File Disease Case 📝</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Document a disease case for tracking and follow-up</p>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Crop Type *</label>
            <select value={cropType} onChange={e => setCropType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: cropType ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}>
              <option value="">Select crop...</option>
              {CROPS.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
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

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Severity</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['low','medium','high'] as const).map(u => (
              <button key={u} type="button" onClick={() => setUrgency(u)}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${urgency === u ? (u === 'high' ? C.red : u === 'medium' ? 'var(--color-harvest)' : 'var(--color-success)') : C.border}`, background: urgency === u ? (u === 'high' ? 'var(--color-danger-bg)' : u === 'medium' ? 'var(--color-harvest-bg)' : 'var(--color-success-bg)') : 'var(--d-input-bg)', fontWeight: 700, fontSize: 12, color: urgency === u ? (u === 'high' ? C.red : u === 'medium' ? 'var(--color-harvest)' : 'var(--color-success)') : C.muted, cursor: 'pointer', textTransform: 'capitalize' }}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Symptoms *</label>
          <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={3} placeholder="Describe the visible symptoms in detail..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Diagnosis <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Fall Armyworm infestation" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Treatment Plan <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={2} placeholder="Recommended treatment or next steps..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Farmer Name <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <input value={farmerName} onChange={e => setFarmerName(e.target.value)} placeholder="e.g. John Okello" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <p style={{ color: C.red, fontSize: 12, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '12px', background: loading ? 'var(--color-surface-2)' : C.red, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Filing...' : 'File Case Report →'}
        </button>
      </form>
    </div>
  );
}
