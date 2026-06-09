'use client';

import { useState } from 'react';
import { EXPENSE_CATEGORIES, SEASONS } from '@/lib/farm-finance';
import { queueRecord } from '@/lib/db';
import { showToast } from '@/components/ui/Toast';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  red: 'var(--color-danger)', cardBg: 'var(--d-card)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

const CROPS = [
  'maize', 'beans', 'coffee', 'banana', 'cassava',
  'groundnuts', 'rice', 'sorghum', 'sunflower', 'soybean', 'sweet_potato',
];

interface Expense {
  id: string;
  category: string;
  description: string;
  amount_ugx: number;
  quantity: number | null;
  unit: string | null;
  crop_type: string | null;
  season: string;
  expense_date: string;
  notes: string | null;
}

interface Props {
  initialExpenses: Expense[];
}

export function ExpenseForm({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filterSeason, setFilterSeason] = useState<string>('A2026');
  const [filterCrop, setFilterCrop] = useState('');

  const [form, setForm] = useState({
    category: EXPENSE_CATEGORIES[0].value,
    description: '',
    amount_ugx: '',
    quantity: '',
    unit: '',
    crop_type: '',
    season: 'A2026',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const filtered = expenses.filter(e => {
    if (filterSeason && e.season !== filterSeason) return false;
    if (filterCrop && e.crop_type !== filterCrop) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount_ugx, 0);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.description.trim() || !form.amount_ugx || Number(form.amount_ugx) <= 0) {
      setError('Description and a positive amount are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/farm-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount_ugx: Number(form.amount_ugx),
          quantity: form.quantity ? Number(form.quantity) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setExpenses(prev => [json.expense, ...prev]);
      showToast('Expense saved', 'success');
      setForm({
        category: EXPENSE_CATEGORIES[0].value, description: '', amount_ugx: '', quantity: '',
        unit: '', crop_type: '', season: 'A2026',
        expense_date: new Date().toISOString().split('T')[0], notes: '',
      });
      setShowForm(false);
    } catch (e: any) {
      if (!navigator.onLine || (e instanceof TypeError && e.message.includes('fetch'))) {
        const qPayload = {
          ...form,
          amount_ugx: Number(form.amount_ugx),
          quantity: form.quantity ? Number(form.quantity) : null,
        };
        await queueRecord('expenses', qPayload, 'insert');
        showToast('Saved locally — will sync when online', 'warning');
        setShowForm(false);
      } else {
        setError(e.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/farm-expenses?id=${id}`, { method: 'DELETE' });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: `1.5px solid ${C.border}`, fontSize: '14px',
    color: C.text, outline: 'none', background: '#FAFAFA',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 700, color: C.muted,
    display: 'block', marginBottom: '5px',
  };

  return (
    <div>
      {/* Filters + Add button */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        <select value={filterSeason} onChange={e => setFilterSeason(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}>
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCrop} onChange={e => setFilterCrop(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}>
          <option value="">All Crops</option>
          {CROPS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: showForm ? '#F3F4F6' : C.green, color: showForm ? C.text : '#fff',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: C.cardBg, borderRadius: '14px', padding: '24px',
            boxShadow: C.shadow, marginBottom: '24px',
            border: `1.5px solid ${C.border}`,
          }}
        >
          <p style={{ fontSize: '15px', fontWeight: 800, color: C.text, marginBottom: '20px' }}>Log a New Expense</p>
          {error && (
            <div style={{ background: '#FEF2F2', border: `1px solid #FCA5A5`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: C.red }}>{error}</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>

            <div>
              <label style={labelStyle}>Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle} required>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Description *</label>
              <input
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="e.g. 2 bags of DAP fertilizer from Kampala"
                style={inputStyle} required
              />
            </div>

            <div>
              <label style={labelStyle}>Amount (UGX) *</label>
              <input
                type="number" min="1" value={form.amount_ugx}
                onChange={e => set('amount_ugx', e.target.value)}
                placeholder="e.g. 120000"
                style={inputStyle} required
              />
            </div>

            <div>
              <label style={labelStyle}>Quantity</label>
              <input
                type="number" min="0" step="0.01" value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                placeholder="e.g. 2"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Unit</label>
              <input
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
                placeholder="bags, kg, liters, days…"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Crop</label>
              <select value={form.crop_type} onChange={e => set('crop_type', e.target.value)} style={inputStyle}>
                <option value="">— General —</option>
                {CROPS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Season</label>
              <select value={form.season} onChange={e => set('season', e.target.value)} style={inputStyle}>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Date *</label>
              <input
                type="date" value={form.expense_date}
                onChange={e => set('expense_date', e.target.value)}
                style={inputStyle} required
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Notes</label>
              <input
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Optional notes…"
                style={inputStyle}
              />
            </div>

          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 28px', borderRadius: '10px', border: 'none',
                background: saving ? '#9CA3AF' : C.green, color: '#fff',
                fontSize: '14px', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </form>
      )}

      {/* Summary banner */}
      {filtered.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            borderRadius: '12px', padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {filterSeason} {filterCrop ? `· ${filterCrop.replace(/_/g, ' ')}` : '· All Crops'}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginTop: '2px' }}>
              UGX {totalFiltered.toLocaleString()}
            </p>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Expense list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>No expenses yet</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Click "+ Add Expense" to start tracking your farm costs.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.shadow, overflow: 'hidden' }}>
          {filtered.map((expense, i) => (
            <div
              key={expense.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              {/* Category badge */}
              <div
                style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                {getCatEmoji(expense.category)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>
                  {expense.description}
                </p>
                <p style={{ fontSize: '12px', color: C.muted }}>
                  {expense.category.replace(/_/g, ' ')}
                  {expense.crop_type ? ` · ${expense.crop_type.replace(/_/g, ' ')}` : ''}
                  {expense.quantity && expense.unit ? ` · ${expense.quantity} ${expense.unit}` : ''}
                  {' · '}{expense.expense_date}
                </p>
              </div>

              {/* Amount */}
              <p style={{ fontSize: '15px', fontWeight: 800, color: C.text, flexShrink: 0 }}>
                UGX {expense.amount_ugx.toLocaleString()}
              </p>

              {/* Delete */}
              <button
                onClick={() => handleDelete(expense.id)}
                disabled={deleting === expense.id}
                style={{
                  width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                  background: deleting === expense.id ? '#F3F4F6' : '#FEF2F2',
                  color: deleting === expense.id ? C.muted : C.red,
                  cursor: deleting === expense.id ? 'default' : 'pointer',
                  fontSize: '14px', flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCatEmoji(cat: string): string {
  const map: Record<string, string> = {
    seeds: '🌱', fertilizer: '🧪', pesticide: '🧴', labor: '👷',
    land_prep: '🚜', transport: '🚛', equipment: '🔧',
    irrigation: '💧', storage: '🏚️', other: '📦',
  };
  return map[cat] ?? '📦';
}
