'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi','Busia','Kasese','Ntungamo'];
const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'secretary', label: 'Secretary' },
];

export default function AddMemberPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [role, setRole] = useState('member');
  const [cropType, setCropType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ linked: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setError('Please enter the member\'s name'); return; }
    if (!district) { setError('Please select a district'); return; }
    setLoading(true); setError(''); setSuccess(null);
    try {
      const res = await fetch('/api/group-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), phone_number: phoneNumber || null, district, role, crop_type: cropType || null }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to add member');
      setSuccess({ linked: !!json.linked });
      setTimeout(() => router.push('/groups/members'), json.linked ? 1800 : 2600);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {/* Coloured stripe header */}
          <div style={{
            padding: '16px 20px',
            background: success.linked ? 'var(--color-primary-bg)' : 'var(--color-harvest-bg)',
            borderBottom: `1px solid ${success.linked ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
          }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: success.linked ? C.green : 'var(--color-harvest)', margin: 0 }}>
              {success.linked ? 'Member added & notified' : 'Saved to your roster'}
            </p>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
              {success.linked
                ? `${fullName} has a registered AgriNova account and has been sent a notification that they joined your group.`
                : `${fullName} was saved to your member list. Because no matching AgriNova account was found for that phone number, they won't receive notifications or group payouts until they sign up with the same number and are linked.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/groups/members" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Members</Link>
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>Add Member</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Register a new member into your farmer group</p>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Full Name *</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Amina Nakato" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>District *</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: district ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}>
              <option value="">Select district...</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Role</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ROLES.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: role === r.value ? C.greenMed : C.text, fontWeight: role === r.value ? 700 : 400 }}>
                  <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} style={{ accentColor: C.greenMed }} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4 }}>
            Phone Number
            <span style={{ fontWeight: 500, color: 'var(--color-harvest)', marginLeft: 6, fontSize: 11 }}>Strongly recommended</span>
          </label>
          <input
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            placeholder="e.g. 0772 123456"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
            Phone is how we tell two people with the same name apart. If this member has an AgriNova account, the phone links them automatically — and they get notified immediately.
          </p>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Primary Crop <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <input value={cropType} onChange={e => setCropType(e.target.value)} placeholder="e.g. Maize, Coffee, Beans" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '12px', background: loading ? 'var(--color-surface-2)' : C.greenMed, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Adding...' : 'Add Member →'}
        </button>
      </form>
    </div>
  );
}
