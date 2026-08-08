'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScanLine, Search, Trash2, Plus, Minus, Loader2, ShoppingCart, Store, Camera, ArrowLeft } from 'lucide-react';
import { BarcodeScanner } from '@/components/ui/BarcodeScanner';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price_per_unit: number;
  unit: string;
  stock_qty: number;
  is_available: boolean;
}

interface StoreOption {
  id: string;
  name: string;
  is_primary: boolean;
}

interface CartLine {
  productId: string | null;
  productName: string;
  sku: string | null;
  unitPriceUgx: number;
  quantity: number;
  maxStock: number | null;
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)',
};

const PAYMENT_METHODS: { id: string; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'mobile_money', label: 'Mobile Money' },
];

export function TillClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scanError, setScanError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/pos/stores').then(r => r.json()).then(json => {
      const list: StoreOption[] = json.stores ?? [];
      setStores(list);
      const primary = list.find(s => s.is_primary) ?? list[0];
      if (primary) setSelectedStoreId(primary.id);
    });
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;
    setLoadingProducts(true);
    setCart([]);
    fetch(`/api/supplier-products?storeId=${selectedStoreId}`)
      .then(r => r.json())
      .then(json => setProducts((json.data ?? []).filter((p: Product) => p.is_available)))
      .finally(() => setLoadingProducts(false));
  }, [selectedStoreId]);

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(l => l.productId === p.id);
      if (existing) {
        return prev.map(l => l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, {
        productId: p.id, productName: p.name, sku: p.sku,
        unitPriceUgx: Number(p.price_per_unit), quantity: 1, maxStock: Number(p.stock_qty),
      }];
    });
  }

  // Shared by manual entry, a hardware scanner typing + Enter, and the
  // camera scanner's onDetected callback — one lookup path for all three.
  function lookupAndAdd(code: string) {
    const match = products.find(p => p.barcode === code || p.sku === code);
    if (match) {
      addToCart(match);
      setScanError('');
    } else {
      setScanError(`No product found for "${code}"`);
    }
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    lookupAndAdd(code);
    setBarcode('');
    // Immediately re-focus the scanner field for the next scan
    requestAnimationFrame(() => barcodeRef.current?.focus());
  }

  function handleCameraDetected(code: string) {
    setScannerOpen(false);
    lookupAndAdd(code);
  }

  function updateQty(productId: string | null, delta: number) {
    setCart(prev => prev
      .map(l => l.productId === productId ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l)
      .filter(l => l.quantity > 0));
  }

  function removeLine(productId: string | null) {
    setCart(prev => prev.filter(l => l.productId !== productId));
  }

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search, products]);

  const subtotal = cart.reduce((s, l) => s + l.unitPriceUgx * l.quantity, 0);
  const discountUgx = Number(discount) || 0;
  const total = Math.max(subtotal - discountUgx, 0);

  async function completeSale() {
    if (cart.length === 0) { setError('Cart is empty'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(l => ({
            productId: l.productId, productName: l.productName,
            sku: l.sku, quantity: l.quantity, unitPriceUgx: l.unitPriceUgx,
          })),
          paymentMethod,
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          discountUgx,
          storeId: selectedStoreId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Checkout failed');
      router.push(`/pos/receipt/${json.saleId}`);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: "'Poppins','Inter',system-ui,sans-serif" }}>
      <style>{`
        @media (max-width: 760px) {
          .pos-till-grid { grid-template-columns: 1fr !important; }
          .pos-checkout-panel { position: static !important; }
        }
      `}</style>
      <div style={{ marginBottom: 18 }}>
        <Link
          href="/supplier/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, fontWeight: 700, color: C.muted, textDecoration: 'none',
            padding: '7px 12px 7px 8px', borderRadius: 999, border: `1.5px solid ${C.border}`,
            background: C.card, boxShadow: C.shadow, marginBottom: 14,
            transition: 'color 120ms ease, border-color 120ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.green; e.currentTarget.style.borderColor = C.green; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>Point of Sale</h1>
            <p style={{ fontSize: 12.5, color: C.muted, margin: '4px 0 0' }}>Scan a barcode or search for a product to add to the sale.</p>
          </div>
          {stores.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card }}>
              <Store size={14} style={{ color: C.green }} />
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: C.text }}
              >
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {scannerOpen && (
        <BarcodeScanner onDetected={handleCameraDetected} onClose={() => setScannerOpen(false)} />
      )}

      <div className="pos-till-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 20 }}>
        {/* Left: scan/search + cart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Barcode scanner input */}
          <form onSubmit={handleBarcodeSubmit} style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Scan barcode
              </label>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
                  border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                }}
              >
                <Camera size={13} /> Scan with camera
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '10px 14px' }}>
              <ScanLine size={18} style={{ color: C.green, flexShrink: 0 }} />
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="Scan with a hardware scanner or type a code"
                autoComplete="off"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: C.text }}
              />
            </div>
            {scanError && (
              <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '8px 0 0', fontWeight: 600 }}>
                {scanError}
              </p>
            )}
          </form>

          {/* Name search */}
          <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 16, position: 'relative' }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Or search by name
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '10px 14px' }}>
              <Search size={16} style={{ color: C.muted, flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={loadingProducts ? 'Loading products…' : 'Product name or SKU'}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: C.text }}
              />
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { addToCart(p); setSearch(''); }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>
                      UGX {Number(p.price_per_unit).toLocaleString()} · {p.stock_qty} {p.unit} left
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ShoppingCart size={16} style={{ color: C.text }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>Cart ({cart.length})</p>
            </div>
            {cart.length === 0 ? (
              <p style={{ fontSize: 13, color: C.muted, margin: 0, padding: '20px 0', textAlign: 'center' }}>
                No items yet — scan or search a product above.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cart.map(line => (
                  <div key={line.productId ?? line.productName} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {line.productName}
                      </p>
                      <p style={{ fontSize: 11.5, color: C.muted, margin: '2px 0 0' }}>
                        UGX {line.unitPriceUgx.toLocaleString()} each
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => updateQty(line.productId, -1)}
                        style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, minWidth: 20, textAlign: 'center' }}>
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(line.productId, 1)}
                        style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0, minWidth: 78, textAlign: 'right', flexShrink: 0 }}>
                      UGX {(line.unitPriceUgx * line.quantity).toLocaleString()}
                    </p>
                    <button
                      onClick={() => removeLine(line.productId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', flexShrink: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: checkout panel */}
        <div className="pos-checkout-panel" style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 18, height: 'fit-content', position: 'sticky', top: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 14px' }}>Checkout</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer name (optional)"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none' }}
            />
            <input
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="Customer phone (optional)"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none' }}
            />
            <input
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              type="number"
              min={0}
              placeholder="Discount UGX (optional)"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none' }}
            />
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
            Payment method
          </p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                style={{
                  flex: 1, padding: '9px 6px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${paymentMethod === m.id ? C.green : C.border}`,
                  background: paymentMethod === m.id ? 'var(--color-primary-bg)' : 'transparent',
                  color: paymentMethod === m.id ? C.green : C.muted,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.muted, marginBottom: 6 }}>
              <span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span>
            </div>
            {discountUgx > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.muted, marginBottom: 6 }}>
                <span>Discount</span><span>&minus; UGX {discountUgx.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 900, color: C.text, marginTop: 8 }}>
              <span>Total</span><span>UGX {total.toLocaleString()}</span>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 10px', fontWeight: 600 }}>
              {error}
            </p>
          )}

          <button
            onClick={completeSale}
            disabled={submitting || cart.length === 0}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              cursor: submitting || cart.length === 0 ? 'not-allowed' : 'pointer',
              background: submitting || cart.length === 0 ? C.border : C.green,
              color: '#fff', fontWeight: 800, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
              : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
