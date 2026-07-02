'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { queueRecord } from '@/lib/db';
import { showToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Package, Leaf, FlaskConical, ShieldCheck, Wrench, Wheat, Pin, AlertTriangle, CheckCircle2, Banknote, LayoutGrid, Search } from 'lucide-react';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number | null;
  cost_per_unit: number | null;
  notes: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  primary_crop: string | null;
}

interface Props {
  initialItems: InventoryItem[];
  profile: Profile | null;
}

const C = {
  text:        'var(--d-text)',
  muted:       'var(--d-muted)',
  border:      'var(--d-border)',
  cardBg:      'var(--d-card)',
  pageBg:      'var(--d-page)',
  green:       'var(--color-primary)',
  greenMed:    'var(--color-primary-hover)',
  greenBright: 'var(--color-primary-muted)',
  amber:       'var(--color-harvest)',
  red:         'var(--color-danger)',
  blue:        'var(--color-sky)',
  cardShadow:  'var(--d-shadow-card)',
};

type Category = 'all' | 'seeds' | 'fertilizers' | 'pesticides' | 'tools' | 'harvest' | 'other';

const CATS: { key: Category; label: string; icon: ReactNode; color: string; bg: string }[] = [
  { key: 'all',         label: 'All Items',   icon: <Package size={14} />,     color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  { key: 'seeds',       label: 'Seeds',       icon: <Leaf size={14} />,        color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  { key: 'fertilizers', label: 'Fertilizers', icon: <FlaskConical size={14} />,color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
  { key: 'pesticides',  label: 'Pesticides',  icon: <ShieldCheck size={14} />, color: '#7C3AED',              bg: '#EDE9FE' },
  { key: 'tools',       label: 'Tools',       icon: <Wrench size={14} />,      color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  { key: 'harvest',     label: 'Harvest',     icon: <Wheat size={14} />,       color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  { key: 'other',       label: 'Other',       icon: <Pin size={14} />,         color: 'var(--d-muted)',       bg: 'var(--color-surface-2)' },
];

const UNITS = ['kg', 'g', 'liters', 'ml', 'bags', 'crates', 'bunches', 'items', 'tons', 'acres'];

const EMPTY_FORM = {
  name: '', category: 'seeds', quantity: '', unit: 'kg',
  low_stock_threshold: '', cost_per_unit: '', notes: '',
};

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: ReactNode }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, borderTop: `3px solid ${color}`, padding: '18px 20px' }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
        <span style={{ display: 'flex', color }}>{icon}</span>
      </div>
      <p className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>
    </div>
  );
}

export function InventoryClient({ initialItems, profile }: Props) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const { totalValue, lowStockCount } = useMemo(() => ({
    totalValue:    items.reduce((s, i) => s + i.quantity * (i.cost_per_unit ?? 0), 0),
    lowStockCount: items.filter(i => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold).length,
  }), [items]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach(i => { m[i.category] = (m[i.category] ?? 0) + 1; });
    return m;
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q));
    }
    return list;
  }, [items, activeCategory, debouncedSearch]);

  function openAdd() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold != null ? String(item.low_stock_threshold) : '',
      cost_per_unit: item.cost_per_unit != null ? String(item.cost_per_unit) : '',
      notes: item.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Item name is required'); return; }
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 0) {
      setFormError('Enter a valid quantity'); return;
    }
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit,
      low_stock_threshold: form.low_stock_threshold ? Number(form.low_stock_threshold) : null,
      cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingItem) {
        const res = await fetch('/api/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Save failed'); }
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload } : i));
        showToast('Item updated', 'success');
      } else {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Save failed'); }
        const { item } = await res.json();
        setItems(prev => [item, ...prev]);
        showToast('Item saved', 'success');
      }
      setShowForm(false);
    } catch (e: unknown) {
      // Network failure — queue for later sync
      if (!navigator.onLine || (e instanceof TypeError && e.message.includes('fetch'))) {
        await queueRecord('inventory', editingItem ? { id: editingItem.id, ...payload } : payload, editingItem ? 'update' : 'insert');
        if (!editingItem) setItems(prev => [{ ...payload, id: `offline-${Date.now()}`, created_at: new Date().toISOString() } as InventoryItem, ...prev]);
        showToast('Saved locally — will sync when online', 'warning');
        setShowForm(false);
      } else {
        setFormError(e instanceof Error ? e.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    setDeleting(null);
  }

  const catInfo = (key: string) => CATS.find(c => c.key === key) ?? CATS[CATS.length - 1];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Farm Inventory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · {CATS.slice(1).filter(c => categoryCounts[c.key]).length} categories
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-primary)', color: '#ffffff' }}
        >
          <span>+</span>
          <span>Add Item</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={String(items.length)} sub="In inventory" color={C.greenBright} icon={<Package size={20} />} />
        <StatCard
          label="Low Stock"
          value={String(lowStockCount)}
          sub={lowStockCount > 0 ? 'Needs restocking' : 'All well stocked'}
          color={lowStockCount > 0 ? C.red : C.greenBright}
          icon={lowStockCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
        />
        <StatCard
          label="Inventory Value"
          value={totalValue > 0 ? `UGX ${Math.round(totalValue).toLocaleString()}` : '—'}
          sub={totalValue > 0 ? 'Estimated total' : 'Add costs to calculate'}
          color={C.amber}
          icon={<Banknote size={20} />}
        />
        <StatCard
          label="Categories"
          value={String(CATS.slice(1).filter(c => categoryCounts[c.key]).length)}
          sub="Active categories"
          color={C.blue}
          icon={<LayoutGrid size={20} />}
        />
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
          <span style={{ display: 'flex', color: 'var(--color-danger)' }}><AlertTriangle size={20} /></span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-danger)' }}>
              {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} running low
            </p>
            <p className="text-xs" style={{ color: 'var(--d-muted)' }}>
              {items.filter(i => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold).map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search inventory..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
          style={{ background: C.cardBg, color: C.text, borderColor: C.border, outline: 'none' }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATS.map(c => {
          const count = c.key === 'all' ? items.length : (categoryCounts[c.key] ?? 0);
          const active = activeCategory === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: active ? C.green : C.cardBg,
                color: active ? '#fff' : C.muted,
                border: `1px solid ${active ? C.green : C.border}`,
                boxShadow: active ? C.cardShadow : 'none',
              }}
            >
              <span style={{ display: 'flex' }}>{c.icon}</span>
              <span>{c.label}</span>
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)', color: active ? '#fff' : C.muted }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div
          style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}
        >
          {items.length === 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--color-primary)' }}><Leaf size={56} /></div>
              <p className="text-lg font-black mb-2" style={{ color: C.text }}>No inventory yet</p>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Track your seeds, fertilizers, tools, and harvest stock. Know exactly what you have and when to restock.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
                {[
                  { icon: <Leaf size={28} />, label: 'Seeds', desc: 'Maize, beans, sorghum...' },
                  { icon: <FlaskConical size={28} />, label: 'Fertilizers', desc: 'DAP, urea, organic...' },
                  { icon: <Wrench size={28} />, label: 'Tools', desc: 'Hoes, sprayers, pumps...' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--color-primary-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: 'var(--color-primary)' }}>{icon}</div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{label}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-primary-hover)' }}>{desc}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={openAdd}
                className="px-6 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'var(--color-primary)', color: '#ffffff' }}
              >
                Add your first item →
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.muted }}><Search size={40} /></div>
              <p className="text-base font-bold" style={{ color: C.text }}>No items found</p>
              <p className="text-sm mt-1" style={{ color: C.muted }}>
                Try a different category or search term
              </p>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {/* Table header */}
          <div
            className="hidden sm:grid px-5 py-3"
            style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1fr auto', borderBottom: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.02)' }}
          >
            {['Item', 'Category', 'Stock', 'Value', ''].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{h}</p>
            ))}
          </div>

          <div className="divide-y" style={{ borderColor: C.border }}>
            {filteredItems.map(item => {
              const cat = catInfo(item.category);
              const isLow = item.low_stock_threshold != null && item.quantity <= item.low_stock_threshold;
              const value = item.quantity * (item.cost_per_unit ?? 0);
              const stockPct = item.low_stock_threshold
                ? Math.min(100, Math.round((item.quantity / (item.low_stock_threshold * 3)) * 100))
                : null;

              return (
                <div key={item.id} className="px-5 py-4 flex sm:grid items-center gap-4"
                  style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1fr auto' }}>

                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: cat.bg, color: cat.color }}>
                      {cat.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{item.name}</p>
                      {item.notes && (
                        <p className="text-[11px] truncate" style={{ color: C.muted }}>{item.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="hidden sm:block">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: cat.bg, color: cat.color }}>
                      {cat.label}
                    </span>
                  </div>

                  {/* Stock */}
                  <div className="hidden sm:block">
                    <p className="text-sm font-bold" style={{ color: isLow ? C.red : C.text }}>
                      {item.quantity} {item.unit}
                    </p>
                    {stockPct !== null && (
                      <div className="mt-1 h-1 rounded-full" style={{ background: 'var(--color-surface-2)', width: 80 }}>
                        <div className="h-1 rounded-full transition-all"
                          style={{ width: `${stockPct}%`, background: isLow ? C.red : C.greenBright }} />
                      </div>
                    )}
                    {isLow && (
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: C.red }}>Low stock</p>
                    )}
                  </div>

                  {/* Value */}
                  <div className="hidden sm:block">
                    <p className="text-sm" style={{ color: C.muted }}>
                      {value > 0 ? `UGX ${Math.round(value).toLocaleString()}` : '—'}
                    </p>
                    {item.cost_per_unit && (
                      <p className="text-[10px]" style={{ color: C.muted }}>
                        @ {item.cost_per_unit.toLocaleString()}/{item.unit}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                    <button
                      onClick={() => openEdit(item)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                    >
                      {deleting === item.id ? '...' : 'Del'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: C.cardBg, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <p className="font-black" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {editingItem ? 'Edit Item' : 'Add Inventory Item'}
              </p>
              <button onClick={() => setShowForm(false)} className="text-xl leading-none" style={{ color: C.muted }}>×</button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: C.muted }}>Item Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Maize Seed (Longe 10H)"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: C.cardBg, color: C.text, borderColor: C.border, outline: 'none' }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: C.muted }}>Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATS.slice(1).map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: c.key }))}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: form.category === c.key ? c.bg : 'transparent',
                        color: form.category === c.key ? c.color : C.muted,
                        border: `1.5px solid ${form.category === c.key ? c.color : C.border}`,
                      }}
                    >
                      <span style={{ display: 'flex' }}>{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: C.muted }}>Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ background: C.cardBg, color: C.text, borderColor: C.border, outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: C.muted }}>Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ background: C.cardBg, color: C.text, borderColor: C.border, outline: 'none' }}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Low stock + Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: C.muted }}>Low Stock Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={form.low_stock_threshold}
                    onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                    placeholder="Alert when below..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ background: C.cardBg, color: C.text, borderColor: C.border, outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: C.muted }}>Cost per {form.unit || 'unit'} (UGX)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cost_per_unit}
                    onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ background: C.cardBg, color: C.text, borderColor: C.border, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: C.muted }}>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Supplier, batch number, expiry date..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border resize-none"
                  style={{ background: C.cardBg, color: C.text, borderColor: C.border, outline: 'none' }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#ffffff' }}
              >
                {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
