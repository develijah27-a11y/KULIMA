'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, User, Phone, MapPin, ArrowLeft } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)',
};

interface Initial { fullName: string; businessName: string; phoneNumber: string; location: string; }

export function SupplierProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.fullName);
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber);
  const [location, setLocation] = useState(initial.location);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, business_name: businessName, phone_number: phoneNumber, location }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.error ?? 'Failed to save. Please try again.');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, icon: React.ReactNode, value: string, onChange: (v: string) => void, opts?: { required?: boolean; helper?: string }) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon} {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        required={opts?.required}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'var(--d-input-bg, var(--color-surface))', color: C.text, fontSize: 14 }}
      />
      {opts?.helper && <p style={{ fontSize: 11.5, color: C.muted, margin: '5px 0 0' }}>{opts.helper}</p>}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button
        onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: 0 }}>Business Profile</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>Your business name appears on every receipt customers get.</p>
      </div>

      <form onSubmit={save} style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {field('Business name', <Store size={13} />, businessName, setBusinessName, { helper: 'Shown on receipts and your storefront instead of your personal name — e.g. "Kampala Agro Supplies".' })}
        {field('Your full name', <User size={13} />, fullName, setFullName, { required: true, helper: 'Used internally; not shown to customers if a business name is set.' })}
        {field('Phone number', <Phone size={13} />, phoneNumber, setPhoneNumber)}
        {field('District / location', <MapPin size={13} />, location, setLocation)}

        {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
        {saved && <p style={{ fontSize: 12.5, color: 'var(--color-success)', margin: 0 }}>Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          style={{ padding: '13px', borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontWeight: 800, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
