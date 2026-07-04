import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PrintInvoicesButton } from './PrintInvoicesButton';
import { FileText, Upload } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('id, crop_type, quantity_kg, price_ugx, farmer_name, delivery_date, payment_status, status')
    .eq('offtaker_id', user.id)
    .eq('status', 'completed')
    .order('delivery_date', { ascending: false })
    .limit(20);

  const rows = (contracts ?? []) as any[];
  const unpaid = rows.filter((c: any) => c.payment_status !== 'paid');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Invoices</h1>
        {rows.length > 0 && <PrintInvoicesButton />}
      </div>
      <p className="text-sm" style={{ color: C.muted }}>{rows.length} completed contracts · {unpaid.length} awaiting payment</p>

      {rows.length > 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.6fr 0.5fr', gap: 8 }}>
            {['Contract', 'Amount', 'Delivery', 'Status', ''].map(h => (
              <p key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
            ))}
          </div>
          {rows.map((c: any, i: number) => {
            const amount = (c.price_ugx ?? 0) * (c.quantity_kg ?? 0);
            const paid = c.payment_status === 'paid';
            return (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.6fr 0.5fr', gap: 8, alignItems: 'center', padding: '14px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{c.crop_type}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{c.farmer_name ?? c.district ?? '—'}</p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: C.blue, margin: 0, letterSpacing: '-0.01em' }}>UGX {Math.round(amount).toLocaleString()}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{new Date(c.delivery_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: paid ? 'var(--color-success-bg)' : 'var(--color-harvest-bg)', color: paid ? 'var(--color-success)' : 'var(--color-harvest)' }}>
                  {paid ? 'Paid' : 'Pending'}
                </span>
                <Link href={`/offtaker/invoices/${c.id}`} style={{ fontSize: 11, fontWeight: 700, color: C.blue, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  View →
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.muted }}><FileText size={48} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No invoices yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Invoices are generated when contracts are completed and deliveries confirmed.</p>
          <Link href="/offtaker/contracts" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.blue, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            View Contracts →
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--color-sky-bg)', boxShadow: C.cardShadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: C.blue, margin: '0 0 4px' }}><Upload size={12} />Export Invoices</div>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Print or save as PDF for tax compliance and finance records.</p>
          </div>
          <PrintInvoicesButton />
        </div>
      )}
    </div>
  );
}
