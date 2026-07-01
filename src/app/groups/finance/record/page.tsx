'use client';

import { useState, type FormEvent } from 'react';
import type { JSX } from 'react';
import { Banknote, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', greenMed: 'var(--color-primary-hover)',
};

const TYPES: { value: string; label: string; icon: JSX.Element; color: string; bg: string }[] = [
  { value: 'contribution', label: 'Contribution', icon: <Banknote size={16} />,     color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  { value: 'income',       label: 'Income',       icon: <TrendingUp size={16} />,   color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  { value: 'expense',      label: 'Expense',      icon: <TrendingDown size={16} />, color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
  { value: 'loan',         label: 'Loan',         icon: <Users size={16} />,        color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)'     },
];

export default function RecordFinancePage() {
  const router = useRouter();
  const [type, setType] = useState('contribution');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [memberName, setMemberName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!description.trim()) { setError('Add a description'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/group-finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: Number(amount), description: description.trim(), member_name: memberName || null }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to record transaction');
      router.push('/groups/finance');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedType = TYPES.find(t => t.value === type)!;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/groups/finance" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Group Finance</Link>
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>Record Transaction</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Log contributions, income, expenses, and loans</p>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8 }}>Transaction Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${type === t.value ? t.color : C.border}`, background: type === t.value ? t.bg : 'var(--d-input-bg)', color: type === t.value ? t.color : C.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex' }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Amount (UGX) *</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" placeholder="e.g. 50000" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Description *</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'contribution' ? 'e.g. Monthly contribution - June' : type === 'expense' ? 'e.g. Transport to Kampala market' : 'e.g. Produce sale - 200 kg maize'} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {(type === 'contribution' || type === 'loan') && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Member Name <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
            <input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="Who contributed / received this?" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )}

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '12px', background: loading ? 'var(--color-surface-2)' : selectedType.color, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Recording...' : `Record ${selectedType.label} →`}
        </button>
      </form>
    </div>
  );
}
