import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PrintButton } from '@/app/buyer/orders/[id]/receipt/PrintButton';
import { CheckCircle2 } from 'lucide-react';

export default async function SupplierOrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles').select('id, full_name, business_name, location, phone_number').eq('user_id', user.id).single();
  if (!profile) redirect('/auth/signin');

  const { data: order } = await (supabase.from as any)('supplier_orders')
    .select('id, product_name, buyer_name, quantity, requested_quantity, unit, unit_price, amount, district, status, notes, is_bulk_order, group_name, created_at, updated_at')
    .eq('id', id)
    .eq('supplier_id', profile.id)
    .single();

  if (!order) redirect('/supplier/orders');

  const receiptNo = `AGN-${id.slice(0, 8).toUpperCase()}`;
  const isDelivered = order.status === 'delivered';

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .receipt-wrap { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 680, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <a href="/supplier/orders" style={{ fontSize: 13, color: 'var(--d-muted)', fontWeight: 600, textDecoration: 'none' }}>← Back to Orders</a>
        <PrintButton />
      </div>

      <div className="receipt-wrap" style={{
        maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 40px rgba(0,0,0,0.10)', padding: '40px 44px',
        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", color: '#111',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 26, fontWeight: 900, color: '#15803d', margin: 0, letterSpacing: '-0.03em' }}>CROPIFY</p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>Agricultural Marketplace · Uganda</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111' }}>RECEIPT</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', margin: '4px 0 0' }}>{receiptNo}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Issued: {fmt(order.created_at)}</p>
          </div>
        </div>

        {/* Status badge */}
        <div style={{ marginBottom: 28 }}>
          <span style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: isDelivered ? '#dcfce7' : '#fef3c7',
            color: isDelivered ? '#15803d' : '#b45309',
          }}>
            {isDelivered ? <><CheckCircle2 size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Delivered</> : `Status: ${order.status.replace(/_/g, ' ').toUpperCase()}`}
          </span>
          {order.is_bulk_order && (
            <span style={{ display: 'inline-block', marginLeft: 8, padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#EDE9FE', color: '#7C3AED' }}>
              Bulk Order{order.group_name ? ` — ${order.group_name}` : ''}
            </span>
          )}
        </div>

        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32, padding: '20px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill To</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>{order.buyer_name ?? order.group_name ?? 'Customer'}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{order.district ?? 'Uganda'}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sold By</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>{profile.business_name || profile.full_name || 'Agro Dealer'}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{profile.location ?? 'Uganda'}{profile.phone_number ? ` · ${profile.phone_number}` : ''}</p>
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Description', 'Qty', 'Unit Price', 'Amount'].map(h => (
                <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textAlign: h === 'Description' ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#111', borderBottom: '1px solid #f9fafb' }}>
                {order.product_name}
                {order.notes && <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{order.notes}</span>}
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>{Number(order.quantity).toLocaleString()} {order.unit}</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>UGX {Number(order.unit_price).toLocaleString()}</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#111', borderBottom: '1px solid #f9fafb' }}>UGX {Number(order.amount).toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: '14px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#374151' }}>Total</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 18, fontWeight: 900, color: '#15803d' }}>UGX {Number(order.amount).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            This receipt is generated by Cropify Platform · Receipt #{receiptNo} · {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
            Kampala, Uganda · cropify-ug.vercel.app
          </p>
        </div>
      </div>
    </>
  );
}
