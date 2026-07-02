'use client';

import { useState } from 'react';
import { Leaf, FlaskConical, Wrench, Settings, Package, Store } from 'lucide-react';

function getCatIcon(category: string, size = 22) {
  const cat = category?.toLowerCase();
  if (cat === 'seeds')        return <Leaf size={size} />;
  if (cat === 'fertilizers')  return <FlaskConical size={size} />;
  if (cat === 'pesticides')   return <Wrench size={size} />;
  if (cat === 'tools')        return <Wrench size={size} />;
  if (cat === 'equipment')    return <Settings size={size} />;
  return <Package size={size} />;
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', red: 'var(--color-danger)', amber: 'var(--color-harvest)',
};

const CATEGORIES = ['seeds','fertilizers','pesticides','tools','equipment','other'] as const;
const UNITS = ['kg','g','litre','ml','piece','bag','bundle','box'];


type Cat = typeof CATEGORIES[number];

interface Product {
  id: string;
  name: string;
  category: Cat;
  description?: string;
  price_per_unit: number;
  unit: string;
  stock_qty: number;
  min_order_qty: number;
  district?: string;
  is_available: boolean;
  created_at: string;
}

const EMPTY: Omit<Product,'id'|'created_at'> = {
  name:'', category:'seeds', description:'', price_per_unit:0,
  unit:'kg', stock_qty:0, min_order_qty:1, district:'', is_available:true,
};

export function CatalogueClient({ products: initial }: { products: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initial);
  const [filter, setFilter]     = useState<Cat | 'all'>('all');
  const [modal, setModal]       = useState<Partial<Product> | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]       = useState('');

  const visible = filter === 'all' ? products : products.filter(p => p.category === filter);
  const isEdit  = !!(modal as any)?.id;

  async function save() {
    if (!modal?.name || !modal.price_per_unit) { setError('Name and price are required.'); return; }
    setSaving(true); setError('');
    try {
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch('/api/supplier-products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modal),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }

      if (isEdit) {
        setProducts(prev => prev.map(p => p.id === (modal as any).id ? { ...p, ...modal } as Product : p));
      } else {
        setProducts(prev => [json.data, ...prev]);
      }
      setModal(null);
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    setDeleting(id);
    await fetch(`/api/supplier-products?id=${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeleting(null);
  }

  async function toggleAvail(p: Product) {
    await fetch('/api/supplier-products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, is_available: !p.is_available }),
    });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_available: !x.is_available } : x));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Products
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
        </div>
        <button onClick={() => { setModal({ ...EMPTY }); setError(''); }}
          style={{ padding: '9px 18px', borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Add Product
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: 'Total', value: products.length, color: C.text },
          { label: 'Available', value: products.filter(p => p.is_available).length, color: C.greenMed },
          { label: 'Low Stock', value: products.filter(p => p.stock_qty < 5 && p.is_available).length, color: C.amber },
          { label: 'Categories', value: new Set(products.map(p => p.category)).size, color: C.text },
        ] as const).map(({ label, value, color }) => (
          <div key={label} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 16px' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.03em', margin: 0 }}>{value}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['all', ...CATEGORIES] as const).map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              background: filter === c ? C.green : 'var(--d-subtle)', color: filter === c ? '#fff' : C.muted }}>
            {c === 'all' ? 'All' : <><span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>{getCatIcon(c, 12)}</span>{c}</>}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: C.red, fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* Product grid */}
      {visible.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.muted }}><Store size={48} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>
            {filter === 'all' ? 'No products yet' : `No ${filter} listed`}
          </p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Add your first product to start receiving orders from farmers.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {visible.map((p, i) => {
            const lowStock = p.stock_qty < 5 && p.is_available;
            return (
              <div key={p.id} style={{ padding: '16px 20px', borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: lowStock ? 'var(--color-danger-bg)' : 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: lowStock ? C.red : C.green }}>
                  {getCatIcon(p.category)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{p.name}</p>
                    {!p.is_available && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'var(--color-surface-2)', color: C.muted }}>Hidden</span>
                    )}
                    {lowStock && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'var(--color-harvest-bg)', color: C.amber }}>Low stock</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0', textTransform: 'capitalize' }}>
                    {p.category} · Stock: {p.stock_qty} {p.unit}
                    {p.district ? ` · ${p.district}` : ''}
                  </p>
                  {p.description && (
                    <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.green, margin: 0 }}>UGX {Math.round(p.price_per_unit).toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>per {p.unit}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleAvail(p)}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {p.is_available ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => { setModal({ ...p }); setError(''); }}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--d-border)', background: 'transparent', color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button disabled={deleting === p.id} onClick={() => del(p.id)}
                    style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'var(--color-danger-bg)', color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {deleting === p.id ? '…' : 'Del'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile FAB – visible only on mobile where header button is small */}
      <button
        className="fab fab-primary md:hidden no-min-touch"
        onClick={() => { setModal({ ...EMPTY }); setError(''); }}
        aria-label="Add product"
        style={{ fontSize: 24, fontWeight: 700 }}
      >
        +
      </button>

      {/* Add/Edit modal */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
          <div style={{ background: C.cardBg, borderRadius: 20, padding: 24, width: '100%', maxWidth: 520 }}>
            <p className="text-base font-black mb-5" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {isEdit ? 'Edit Product' : 'Add Product'}
            </p>

            {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'grid', gap: 14 }}>
              {([
                { label: 'Product Name *', key: 'name', type: 'text', placeholder: 'e.g. Pioneer DH04 Maize Seed' },
                { label: 'Price per Unit (UGX) *', key: 'price_per_unit', type: 'number', placeholder: '0' },
                { label: 'Stock Quantity', key: 'stock_qty', type: 'number', placeholder: '0' },
                { label: 'Minimum Order Qty', key: 'min_order_qty', type: 'number', placeholder: '1' },
                { label: 'District (optional)', key: 'district', type: 'text', placeholder: 'e.g. Kampala' },
              ] as const).map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>{label}</label>
                  <input
                    type={type}
                    value={String((modal as any)[key] ?? '')}
                    onChange={e => setModal(m => ({ ...m!, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Category</label>
                  <select value={modal.category ?? 'other'} onChange={e => setModal(m => ({ ...m!, category: e.target.value as Cat }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Unit</label>
                  <select value={modal.unit ?? 'kg'} onChange={e => setModal(m => ({ ...m!, unit: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Description (optional)</label>
                <textarea
                  value={modal.description ?? ''}
                  onChange={e => setModal(m => ({ ...m!, description: e.target.value }))}
                  placeholder="Product details, usage instructions, brand..."
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={save}
                style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
