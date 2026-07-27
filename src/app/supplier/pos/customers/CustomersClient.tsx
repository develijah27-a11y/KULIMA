'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

interface Customer {
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastSeen: string;
}

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)', green: 'var(--color-primary)',
};

export function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pos/customers').then(r => r.json()).then(json => setCustomers(json.customers ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Customers</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>{customers.length} repeat customer{customers.length !== 1 ? 's' : ''} recorded at checkout</p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: C.muted }}>Loading…</p>
      ) : customers.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.muted }}><Users size={40} /></div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>No customer records yet</p>
          <p style={{ color: C.muted, fontSize: 12.5, marginTop: 4 }}>Ask for a phone number at checkout to start building customer history.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customers.map(c => (
            <div key={c.phone} style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-primary-bg)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 800 }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{c.name}</p>
                <p style={{ fontSize: 11.5, color: C.muted, margin: '3px 0 0' }}>{c.phone} · {c.orderCount} order{c.orderCount !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.green, margin: 0 }}>UGX {Math.round(c.totalSpent).toLocaleString()}</p>
                <p style={{ fontSize: 10.5, color: C.muted, margin: '2px 0 0' }}>total spent</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
