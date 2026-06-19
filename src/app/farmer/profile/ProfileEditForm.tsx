'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', danger: 'var(--color-danger)',
};

const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Mbarara','Gulu','Lira','Masaka',
  'Fort Portal','Arua','Soroti','Kabale','Hoima','Kasese','Tororo','Iganga',
  'Mityana','Mubende','Masindi','Apac','Moroto','Kotido','Kabarole','Bundibugyo',
];

const CROPS = [
  'Maize','Coffee','Beans','Cassava','Rice','Sorghum','Millet','Groundnuts',
  'Sunflower','Tobacco','Tea','Banana','Sugarcane','Cotton','Soybean','Sweet Potato',
];

interface Props {
  initial: {
    full_name: string;
    phone_number: string;
    location: string;
    primary_crop: string;
  };
}

export function ProfileEditForm({ initial }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState(initial);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? 'Failed to save'); return; }
      setSuccess(true);
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    border: `1px solid ${C.border}`, background: 'var(--d-input-bg)',
    color: 'var(--d-input-text)', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: C.muted,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
  };

  if (!editing) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {success && (
          <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
            ✓ Profile saved
          </span>
        )}
        <button
          onClick={() => { setEditing(true); setSuccess(false); }}
          style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardBg, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Edit Profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px 24px' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Edit Profile</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input value={form.full_name} onChange={e => set('full_name', e.target.value)} style={inputStyle} placeholder="Your full name" />
        </div>
        <div>
          <label style={labelStyle}>Phone / MoMo Number</label>
          <input value={form.phone_number} onChange={e => set('phone_number', e.target.value)} style={inputStyle} placeholder="+256 7XX XXX XXX" type="tel" />
        </div>
        <div>
          <label style={labelStyle}>District</label>
          <select value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle}>
            <option value="">Select district</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Primary Crop</label>
          <select value={form.primary_crop} onChange={e => set('primary_crop', e.target.value)} style={inputStyle}>
            <option value="">Select primary crop</option>
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: C.danger, marginTop: 12, fontWeight: 600 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={handleSave}
          disabled={saving || !form.full_name.trim()}
          style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={() => { setEditing(false); setForm(initial); setError(''); }}
          style={{ padding: '11px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardBg, color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
