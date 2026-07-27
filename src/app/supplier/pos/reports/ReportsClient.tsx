'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Package, Store, Users } from 'lucide-react';

interface ReportData {
  periodDays: number;
  totalSales: number;
  totalNet: number;
  totalFees: number;
  saleCount: number;
  byPaymentMethod: Record<string, number>;
  byStore: Record<string, number>;
  byStaff: Record<string, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)',
};

const PERIODS = [7, 30, 90];

function fmt(n: number) { return `UGX ${Math.round(n).toLocaleString()}`; }

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ color: C.text, fontWeight: 600 }}>{label}</span>
        <span style={{ color: C.muted, fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: C.green, borderRadius: 99 }} />
      </div>
    </div>
  );
}

export function ReportsClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pos/reports?days=${days}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [days]);

  const maxStore = data ? Math.max(...Object.values(data.byStore), 1) : 1;
  const maxStaff = data ? Math.max(...Object.values(data.byStaff), 1) : 1;
  const maxProduct = data ? Math.max(...data.topProducts.map(p => p.revenue), 1) : 1;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Sales Reports</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Point of Sale performance</p>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'var(--color-surface-2)' }}>
          {PERIODS.map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: days === d ? C.card : 'transparent', color: days === d ? C.text : C.muted }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <p style={{ fontSize: 13, color: C.muted }}>Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Sales', value: fmt(data.totalSales), color: C.text },
              { label: 'Net Payout', value: fmt(data.totalNet), color: 'var(--color-success)' },
              { label: 'Platform Fees', value: fmt(data.totalFees), color: 'var(--color-harvest)' },
              { label: 'Transactions', value: String(data.saleCount), color: C.text },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, padding: '14px 16px' }}>
                <p style={{ fontSize: 17, fontWeight: 900, color, letterSpacing: '-0.02em', margin: 0 }}>{value}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Package size={16} style={{ color: C.green }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>Top Products</p>
            </div>
            {data.topProducts.length === 0 ? (
              <p style={{ fontSize: 13, color: C.muted }}>No sales in this period.</p>
            ) : data.topProducts.map(p => (
              <Bar key={p.name} label={`${p.name} (${p.quantity.toLocaleString()} sold)`} value={p.revenue} max={maxProduct} />
            ))}
          </div>

          {Object.keys(data.byStore).length > 1 && (
            <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Store size={16} style={{ color: C.green }} />
                <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>By Branch</p>
              </div>
              {Object.entries(data.byStore).map(([name, value]) => (
                <Bar key={name} label={name} value={value} max={maxStore} />
              ))}
            </div>
          )}

          <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={16} style={{ color: C.green }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>By Staff</p>
            </div>
            {Object.keys(data.byStaff).length === 0 ? (
              <p style={{ fontSize: 13, color: C.muted }}>No sales in this period.</p>
            ) : Object.entries(data.byStaff).map(([key, value]) => (
              <Bar key={key} label={key === 'owner' ? 'You (owner)' : 'Staff'} value={value} max={maxStaff} />
            ))}
          </div>

          <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TrendingUp size={16} style={{ color: C.green }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>By Payment Method</p>
            </div>
            {Object.entries(data.byPaymentMethod).map(([method, value]) => (
              <div key={method} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.text, fontWeight: 600, textTransform: 'capitalize' }}>{method.replace('_', ' ')}</span>
                <span style={{ color: C.muted, fontWeight: 700 }}>{fmt(value)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
