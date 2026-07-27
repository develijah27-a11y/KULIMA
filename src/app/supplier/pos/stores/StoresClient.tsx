'use client';

import { useEffect, useState } from 'react';
import { Store, Plus, Check, Ban } from 'lucide-react';

interface StoreRow {
  id: string;
  name: string;
  is_primary: boolean;
  district: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', red: 'var(--color-danger)',
};

export function StoresClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    fetch('/api/pos/stores').then(r => r.json()).then(json => setStores(json.stores ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function addStore() {
    if (!name.trim()) { setError('Branch name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/pos/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), district: district.trim() || null, address: address.trim() || null, phone: phone.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to add branch');
      setModalOpen(false);
      setName(''); setDistrict(''); setAddress(''); setPhone('');
      load();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: StoreRow) {
    await fetch('/api/pos/stores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
    });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Branches</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{stores.length} branch{stores.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={() => { setModalOpen(true); setError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Add Branch
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: C.muted }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stores.map(s => (
            <div key={s.id} style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: s.is_active ? 1 : 0.55 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-primary-bg)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Store size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                  {s.name}{s.is_primary && <span style={{ fontSize: 10, fontWeight: 800, color: C.green, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main</span>}
                </p>
                <p style={{ fontSize: 11.5, color: C.muted, margin: '3px 0 0' }}>
                  {[s.district, s.address].filter(Boolean).join(' · ') || 'No address set'}{!s.is_active ? ' · Disabled' : ''}
                </p>
              </div>
              {!s.is_primary && (
                <button onClick={() => toggleActive(s)} title={s.is_active ? 'Disable' : 'Enable'} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${s.is_active ? C.border : C.green}`, background: s.is_active ? 'transparent' : 'var(--color-success-bg)', color: s.is_active ? C.red : C.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.is_active ? <Ban size={14} /> : <Check size={14} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 }}>
            <p className="text-base font-black mb-5" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Add Branch</p>
            {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                { label: 'Branch Name', value: name, setter: setName, placeholder: 'e.g. Mbarara Branch' },
                { label: 'District (optional)', value: district, setter: setDistrict, placeholder: 'e.g. Mbarara' },
                { label: 'Address (optional)', value: address, setter: setAddress, placeholder: 'Street / landmark' },
                { label: 'Phone (optional)', value: phone, setter: setPhone, placeholder: 'e.g. 0700 000000' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>{label}</label>
                  <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button disabled={saving} onClick={addStore} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding…' : 'Add Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
