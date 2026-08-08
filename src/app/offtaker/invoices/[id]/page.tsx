import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PrintInvoiceButton } from './PrintInvoiceButton';
import { CheckCircle2, Clock } from 'lucide-react';

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contract } = await (supabase.from as any)('offtaker_contracts')
    .select('id, crop_type, quantity_kg, price_ugx, farmer_name, district, delivery_date, payment_status, status, notes, created_at, updated_at')
    .eq('id', id)
    .eq('offtaker_id', user.id)
    .single();

  if (!contract) redirect('/offtaker/invoices');

  const amount    = (contract.price_ugx ?? 0) * (contract.quantity_kg ?? 0);
  const invoiceNo = `KUL-OFT-${id.slice(0, 8).toUpperCase()}`;
  const paid      = contract.payment_status === 'paid';

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .invoice-wrap { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 720, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <a href="/offtaker/invoices" style={{ fontSize: 13, color: 'var(--d-muted)', fontWeight: 600, textDecoration: 'none' }}>← Back to Invoices</a>
        <PrintInvoiceButton />
      </div>

      <div className="invoice-wrap" style={{
        maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 40px rgba(0,0,0,0.10)', padding: '44px 48px',
        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", color: '#111',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 26, fontWeight: 900, color: '#15803d', margin: 0, letterSpacing: '-0.03em' }}>CROPIFY</p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>Agricultural Marketplace · Uganda</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111' }}>INVOICE</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', margin: '4px 0 0' }}>{invoiceNo}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Issued: {fmt(contract.created_at)}</p>
          </div>
        </div>

        {/* Status badge */}
        <div style={{ marginBottom: 28 }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: paid ? '#dcfce7' : '#fef3c7',
            color: paid ? '#15803d' : '#b45309',
          }}>
            {paid ? <><CheckCircle2 size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Payment Settled</> : <><Clock size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Payment Pending</>}
          </span>
        </div>

        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32, padding: '20px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill To (Offtaker)</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>Your Account</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Uganda</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Farmer / Supplier</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>{contract.farmer_name ?? '—'}</p>
            {contract.district && (
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{contract.district}</p>
            )}
          </div>
        </div>

        {/* Line items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Description', 'Qty (kg)', 'Price / kg', 'Total'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af',
                  textAlign: h === 'Description' ? 'left' : 'right',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid #f3f4f6',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#111', borderBottom: '1px solid #f9fafb' }}>
                {contract.crop_type?.charAt(0).toUpperCase() + contract.crop_type?.slice(1)} — Agricultural Produce
                {contract.delivery_date && (
                  <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>
                    Delivery: {fmt(contract.delivery_date)}
                  </span>
                )}
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>
                {Number(contract.quantity_kg).toLocaleString()}
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>
                UGX {Number(contract.price_ugx).toLocaleString()}
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#111', borderBottom: '1px solid #f9fafb' }}>
                UGX {Math.round(amount).toLocaleString()}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: '14px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#374151' }}>
                Total {paid ? 'Paid' : 'Due'}
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 20, fontWeight: 900, color: '#0369a1' }}>
                UGX {Math.round(amount).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Notes */}
        {contract.notes && (
          <div style={{ marginBottom: 24, padding: '14px 16px', background: '#f9fafb', borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}><strong>Notes:</strong> {contract.notes}</p>
          </div>
        )}

        {/* Contract details */}
        <div style={{ marginBottom: 32, padding: '16px', background: '#f0f9ff', borderRadius: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Contract Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Contract Status', value: contract.status?.replace(/_/g, ' ') },
              { label: 'Payment Status', value: paid ? 'Settled' : 'Pending' },
              { label: 'Contract Date', value: fmt(contract.created_at) },
              { label: 'Delivery Date', value: fmt(contract.delivery_date) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, textTransform: 'capitalize' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            Invoice #{invoiceNo} · Generated by Cropify Platform · {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
            Kampala, Uganda · cropify.app · Protected by escrow-backed transactions
          </p>
        </div>
      </div>
    </>
  );
}
