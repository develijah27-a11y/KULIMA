'use client';

import { useEffect, useState } from 'react';
import { Truck, Plus, Check, X, Trash2 } from 'lucide-react';

interface POItem { productName: string; quantity: number; unitCostUgx: string; }
interface PurchaseOrder {
  id: string;
  vendor_name: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  notes: string | null;
  expected_date: string | null;
  received_at: string | null;
  created_at: string;
  pos_purchase_order_items: { id: string; product_name: string; quantity: number; unit_cost_ugx: number | null }[];
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', red: 'var(--color-danger)',
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: 'var(--d-muted)', bg: 'var(--color-surface-2)' },
  ordered:   { label: 'Ordered',   color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  received:  { label: 'Received',  color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
};

export function PurchaseOrdersClient() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState<POItem[]>([{ productName: '', quantity: 1, unitCostUgx: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    fetch('/api/pos/purchase-orders').then(r => r.json()).then(json => setOrders(json.purchaseOrders ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function updateItem(i: number, field: keyof POItem, value: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }
  function addItemRow() { setItems(prev => [...prev, { productName: '', quantity: 1, unitCostUgx: '' }]); }
  function removeItemRow(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  async function createPO() {
    if (!vendorName.trim()) { setError('Vendor name is required'); return; }
    const validItems = items.filter(i => i.productName.trim() && i.quantity > 0);
    if (validItems.length === 0) { setError('Add at least one item'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/pos/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: vendorName.trim(),
          notes: notes.trim() || null,
          expectedDate: expectedDate || null,
          items: validItems.map(i => ({ productId: null, productName: i.productName.trim(), quantity: Number(i.quantity), unitCostUgx: i.unitCostUgx ? Number(i.unitCostUgx) : null })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create purchase order');
      setModalOpen(false);
      setVendorName(''); setNotes(''); setExpectedDate(''); setItems([{ productName: '', quantity: 1, unitCostUgx: '' }]);
      load();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, action: string) {
    await fetch('/api/pos/purchase-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Purchase Orders</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Track restocking from your distributors</p>
        </div>
        <button onClick={() => { setModalOpen(true); setError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> New Order
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: C.muted }}>Loading…</p>
      ) : orders.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.muted }}><Truck size={40} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>No purchase orders yet</p>
          <p style={{ color: C.muted, fontSize: 12.5, marginTop: 4 }}>Track what you've ordered from your distributor and receive it straight into inventory.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(po => {
            const s = STATUS_STYLE[po.status];
            return (
              <div key={po.id} style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{po.vendor_name}</p>
                    <p style={{ fontSize: 11.5, color: C.muted, margin: '3px 0 0' }}>
                      {po.pos_purchase_order_items.length} item{po.pos_purchase_order_items.length !== 1 ? 's' : ''}
                      {po.expected_date ? ` · expected ${new Date(po.expected_date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '4px 10px', borderRadius: 99, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {po.pos_purchase_order_items.map(it => (
                    <span key={it.id} style={{ fontSize: 11, color: C.muted, background: 'var(--color-surface-2)', padding: '3px 8px', borderRadius: 8 }}>
                      {it.product_name} × {it.quantity}
                    </span>
                  ))}
                </div>
                {po.status === 'ordered' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => act(po.id, 'receive')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--color-success-bg)', color: 'var(--color-success)', cursor: 'pointer' }}>
                      <Check size={13} /> Mark Received
                    </button>
                    <button onClick={() => act(po.id, 'cancel')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--color-danger-bg)', color: C.red, cursor: 'pointer' }}>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 480 }}>
            <p className="text-base font-black mb-5" style={{ color: C.text, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>New Purchase Order</p>
            {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Vendor / Distributor Name</label>
                <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g. Kampala Agro Distributors"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Expected Date (optional)</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Items</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input value={it.productName} onChange={e => updateItem(i, 'productName', e.target.value)} placeholder="Product"
                        style={{ flex: 2, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 12.5, boxSizing: 'border-box' }} />
                      <input type="number" value={it.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} placeholder="Qty"
                        style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 12.5, boxSizing: 'border-box' }} />
                      <input type="number" value={it.unitCostUgx} onChange={e => updateItem(i, 'unitCostUgx', e.target.value)} placeholder="Cost (opt.)"
                        style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 12.5, boxSizing: 'border-box' }} />
                      <button onClick={() => removeItemRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, flexShrink: 0 }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={addItemRow} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: C.green, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add item</button>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button disabled={saving} onClick={createPO} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
