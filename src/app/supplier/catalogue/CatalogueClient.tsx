'use client';

import { useEffect, useRef, useState } from 'react';
import { Leaf, FlaskConical, Wrench, Settings, Package, Store } from 'lucide-react';
import { CameraCapture } from '@/components/ui/CameraCapture';

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
  low_stock_threshold?: number | null;
  district?: string;
  is_available: boolean;
  image_url?: string;
  sku?: string | null;
  barcode?: string | null;
  cost_price_ugx?: number | null;
  store_id?: string | null;
  created_at: string;
}

interface StoreOption { id: string; name: string; is_primary: boolean; }

const EMPTY: Omit<Product,'id'|'created_at'> = {
  name:'', category:'seeds', description:'', price_per_unit:0,
  unit:'kg', stock_qty:0, min_order_qty:1, low_stock_threshold:null, district:'', is_available:true, image_url:'',
  sku:'', barcode:'', cost_price_ugx:null,
};

// Falls back to 5 units when a supplier hasn't set their own threshold —
// same default the low-stock alert cron job uses.
function isLowStock(p: Product) {
  return p.stock_qty <= (p.low_stock_threshold ?? 5) && p.is_available;
}

export function CatalogueClient({ products: initial }: { products: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initial);
  const [filter, setFilter]     = useState<Cat | 'all'>('all');
  const [modal, setModal]       = useState<Partial<Product> | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [stores, setStores]     = useState<StoreOption[]>([]);

  // Only relevant once there's more than one branch (Enterprise tier) — the
  // picker in the add/edit modal stays hidden for everyone else.
  useEffect(() => {
    fetch('/api/pos/stores').then(r => r.json()).then(json => setStores(json.stores ?? []));
  }, []);

  // ── Barcode scan-only field ────────────────────────────────────────────
  // Same technique as the till (TillClient.tsx): a hardware/software
  // scanner fires all characters in a burst (< 60ms apart) then Enter.
  // Manual typing arrives much slower, so any keystroke with a bigger gap
  // than that is swallowed. No camera, no permission prompt, no warm-up —
  // registers a scan instantly, exactly like the till already does.
  const [barcodeDraft, setBarcodeDraft] = useState('');
  const lastBarcodeKeyTimeRef = useRef<number>(0);
  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab') return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeDraft.trim();
      if (code) setModal(m => ({ ...m!, barcode: code }));
      setBarcodeDraft('');
      return;
    }
    const now = Date.now();
    const gap = now - lastBarcodeKeyTimeRef.current;
    lastBarcodeKeyTimeRef.current = now;
    if (gap > 60) e.preventDefault(); // manual keystroke — swallow it
  }

  const visible = filter === 'all' ? products : products.filter(p => p.category === filter);
  const isEdit  = !!(modal as any)?.id;

  async function save() {
    if (!modal?.name || !modal.price_per_unit) { setError('Name and price are required.'); return; }
    if (!modal.image_url) { setError('Take a live photo of the product before saving.'); return; }
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
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            My Inventory
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
          { label: 'Low Stock', value: products.filter(isLowStock).length, color: C.amber },
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p) => {
            const lowStock = isLowStock(p);
            return (
              <div key={p.id} style={{
                background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', opacity: p.is_available ? 1 : 0.6,
              }}>
                {/* Photo header */}
                <div style={{ height: 130, position: 'relative', overflow: 'hidden', background: 'var(--color-primary-bg)' }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green }}>
                      {getCatIcon(p.category, 40)}
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                    {!p.is_available && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff' }}>Hidden</span>
                    )}
                    {lowStock && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'var(--color-harvest)', color: '#fff' }}>Low stock</span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '14px 16px', flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{p.name}</p>
                  <p style={{ fontSize: 11.5, color: C.muted, margin: '2px 0 0', textTransform: 'capitalize' }}>
                    {p.category} · Stock: {p.stock_qty} {p.unit}
                    {p.district ? ` · ${p.district}` : ''}
                  </p>
                  <p style={{ fontSize: 10.5, color: C.muted, margin: '2px 0 0' }}>
                    Alerts below {p.low_stock_threshold ?? 5} {p.unit}
                  </p>
                  {p.description && (
                    <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>
                  )}
                  <p style={{ fontSize: 17, fontWeight: 900, color: C.green, margin: '10px 0 0', letterSpacing: '-0.02em' }}>
                    UGX {Math.round(p.price_per_unit).toLocaleString()} <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>/ {p.unit}</span>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                  <button onClick={() => toggleAvail(p)}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                    {p.is_available ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => { setModal({ ...p }); setError(''); }}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'transparent', color: C.text, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button disabled={deleting === p.id} onClick={() => del(p.id)}
                    style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--color-danger-bg)', color: C.red, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
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
            <p className="text-base font-black mb-5" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
              {isEdit ? 'Edit Product' : 'Add Product'}
            </p>

            {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Product Photo *</label>
                {modal.image_url ? (
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                    <img src={modal.image_url} alt="Captured product" style={{ width: '100%', display: 'block' }} />
                    <button
                      type="button"
                      onClick={() => setModal(m => ({ ...m!, image_url: '' }))}
                      style={{ position: 'absolute', top: 8, right: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <CameraCapture onCaptured={(url) => setModal(m => ({ ...m!, image_url: url }))} label="Take a photo of the product" />
                )}
              </div>

              {([
                { label: 'Product Name *', key: 'name', type: 'text', placeholder: 'e.g. Pioneer DH04 Maize Seed' },
                { label: 'Price per Unit (UGX) *', key: 'price_per_unit', type: 'number', placeholder: '0' },
                { label: 'Stock Quantity', key: 'stock_qty', type: 'number', placeholder: '0' },
                { label: 'Minimum Order Qty', key: 'min_order_qty', type: 'number', placeholder: '1' },
                { label: 'Low Stock Alert Below (optional, default 5)', key: 'low_stock_threshold', type: 'number', placeholder: '5' },
                { label: 'District (optional)', key: 'district', type: 'text', placeholder: 'e.g. Kampala' },
                { label: 'SKU (optional)', key: 'sku', type: 'text', placeholder: 'e.g. SEED-MAIZE-01' },
                { label: 'Cost Price (optional — what you paid, for profit reports)', key: 'cost_price_ugx', type: 'number', placeholder: '0' },
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

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Barcode (optional — scanned at POS checkout)</label>
                {modal.barcode ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)' }}>
                    <span style={{ fontSize: 13, color: 'var(--d-input-text)', fontFamily: 'monospace' }}>{modal.barcode}</span>
                    <button type="button" onClick={() => setModal(m => ({ ...m!, barcode: '' }))}
                      style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      Clear
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={barcodeDraft}
                    onChange={e => setBarcodeDraft(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Point scanner here"
                    autoComplete="off"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                )}
              </div>

              {stores.length > 1 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Branch</label>
                  <select value={modal.store_id ?? stores.find(s => s.is_primary)?.id ?? ''} onChange={e => setModal(m => ({ ...m!, store_id: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

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
