'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Copy, Check, Ban, RotateCcw, Users } from 'lucide-react';

interface Staff {
  id: string;
  full_name: string;
  phone: string | null;
  permissions: string[];
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', red: 'var(--color-danger)',
};

const PERMISSION_LABELS: Record<string, string> = {
  checkout: 'Ring up sales',
  refund: 'Process refunds',
  discount: 'Apply discounts',
  view_reports: 'View sales reports',
  manage_inventory: 'Manage inventory',
};

function CredentialBanner({ email, tempPassword, onDismiss }: { email: string; tempPassword: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-success)', margin: '0 0 8px' }}>
        Login created — share these with your staff member now (shown only once)
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <code style={{ fontSize: 13, background: C.card, padding: '6px 12px', borderRadius: 8 }}>{email}</code>
        <code style={{ fontSize: 13, background: C.card, padding: '6px 12px', borderRadius: 8, fontWeight: 800 }}>{tempPassword}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(`Email: ${email}\nPassword: ${tempPassword}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: `1px solid var(--color-success-border)`, background: 'transparent', color: 'var(--color-success)', cursor: 'pointer' }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <button onClick={onDismiss} style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
        Dismiss
      </button>
    </div>
  );
}

export function StaffClient() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['checkout']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credential, setCredential] = useState<{ email: string; tempPassword: string } | null>(null);

  function load() {
    setLoading(true);
    fetch('/api/pos/staff').then(r => r.json()).then(json => setStaff(json.staff ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function togglePermission(p: string) {
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function addStaff() {
    if (!email.trim() || !fullName.trim()) { setError('Email and name are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/pos/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), phone: phone.trim() || null, permissions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to add staff');
      setCredential({ email: json.email, tempPassword: json.tempPassword });
      setModalOpen(false);
      setEmail(''); setFullName(''); setPhone(''); setPermissions(['checkout']);
      load();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, action: string) {
    const res = await fetch(`/api/pos/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (action === 'reset_password' && json.tempPassword) {
      const row = staff.find(s => s.id === id);
      setCredential({ email: row?.full_name ?? '', tempPassword: json.tempPassword });
    }
    load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Staff Accounts</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{staff.length} staff account{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setModalOpen(true); setError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <UserPlus size={15} /> Add Staff
        </button>
      </div>

      {credential && <CredentialBanner email={credential.email} tempPassword={credential.tempPassword} onDismiss={() => setCredential(null)} />}

      {loading ? (
        <p style={{ fontSize: 13, color: C.muted }}>Loading…</p>
      ) : staff.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.muted }}><Users size={40} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>No staff yet</p>
          <p style={{ color: C.muted, fontSize: 12.5, marginTop: 4 }}>Add a cashier so they can ring up sales without sharing your own login.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {staff.map(s => (
            <div key={s.id} style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: s.is_active ? 1 : 0.55 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{s.full_name}</p>
                <p style={{ fontSize: 11.5, color: C.muted, margin: '3px 0 0' }}>
                  {s.permissions.map(p => PERMISSION_LABELS[p] ?? p).join(' · ')}
                  {s.must_change_password && s.is_active ? ' · Awaiting first login' : ''}
                  {!s.is_active ? ' · Disabled' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => act(s.id, 'reset_password')} title="Reset password" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => act(s.id, s.is_active ? 'disable' : 'enable')} title={s.is_active ? 'Disable' : 'Enable'} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${s.is_active ? C.border : C.green}`, background: s.is_active ? 'transparent' : 'var(--color-success-bg)', color: s.is_active ? C.red : C.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.is_active ? <Ban size={14} /> : <Check size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 440 }}>
            <p className="text-base font-black mb-5" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Add Staff Member</p>
            {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Nakato Sarah"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Email (their login)</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="worker@example.com"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Phone (optional)</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0700 000000"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Permissions</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, cursor: 'pointer' }}>
                      <input type="checkbox" checked={permissions.includes(key)} onChange={() => togglePermission(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button disabled={saving} onClick={addStaff} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding…' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
