import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PrintButton } from './PrintButton';
import { CheckCircle2 } from 'lucide-react';

export default async function OrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: order } = await (supabase.from as any)('orders')
    .select(`
      id, crop_type, quantity_kg, unit_price, total_amount, status,
      buyer_note, farmer_note, pickup_district, dropoff_district,
      created_at, confirmed_at, dispatched_at, in_transit_at, delivered_at, completed_at,
      farmer:profiles!farmer_profile_id(full_name, location, primary_crop),
      buyer:profiles!buyer_id(full_name, location)
    `)
    .eq('id', id)
    .eq('buyer_id', user.id)
    .single();

  if (!order) redirect('/buyer/orders');

  const farmer  = (order as any).farmer as any;
  const buyer   = (order as any).buyer as any;
  const receiptNo = `KUL-${id.slice(0, 8).toUpperCase()}`;
  const isComplete = order.status === 'completed';

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const timeline = [
    { label: 'Order Placed',  ts: order.created_at },
    { label: 'Confirmed',     ts: order.confirmed_at },
    { label: 'Dispatched',    ts: order.dispatched_at },
    { label: 'In Transit',    ts: order.in_transit_at },
    { label: 'Delivered',     ts: order.delivered_at },
    { label: 'Completed',     ts: order.completed_at },
  ].filter(e => e.ts);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .receipt-wrap { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Print / Back controls */}
      <div className="no-print" style={{ maxWidth: 680, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <a href="/buyer/orders" style={{ fontSize: 13, color: 'var(--d-muted)', fontWeight: 600, textDecoration: 'none' }}>← Back to Orders</a>
        <PrintButton />
      </div>

      {/* Receipt card */}
      <div className="receipt-wrap" style={{
        maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 40px rgba(0,0,0,0.10)', padding: '40px 44px',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", color: '#111',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 26, fontWeight: 900, color: '#15803d', margin: 0, letterSpacing: '-0.03em' }}>KULIMA</p>
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
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: isComplete ? '#dcfce7' : '#fef3c7',
            color: isComplete ? '#15803d' : '#b45309',
          }}>
            {isComplete ? <><CheckCircle2 size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Payment Complete</> : `Status: ${order.status.toUpperCase()}`}
          </span>
        </div>

        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32, padding: '20px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill To</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>{buyer?.full_name ?? 'Buyer'}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{buyer?.location ?? 'Uganda'}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Seller / Farmer</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>{farmer?.full_name ?? 'Farmer'}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{farmer?.location ?? 'Uganda'}</p>
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Description', 'Qty (kg)', 'Unit Price', 'Amount'].map(h => (
                <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textAlign: h === 'Description' ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#111', borderBottom: '1px solid #f9fafb' }}>
                {order.crop_type?.charAt(0).toUpperCase() + order.crop_type?.slice(1)} — Agricultural Produce
                {order.pickup_district && <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>From: {order.pickup_district} → {order.dropoff_district ?? 'Buyer'}</span>}
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>{Number(order.quantity_kg).toLocaleString()}</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>UGX {Number(order.unit_price).toLocaleString()}</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#111', borderBottom: '1px solid #f9fafb' }}>UGX {Number(order.total_amount).toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: '14px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#374151' }}>Total Paid</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 18, fontWeight: 900, color: '#15803d' }}>UGX {Number(order.total_amount).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes */}
        {(order.buyer_note || order.farmer_note) && (
          <div style={{ marginBottom: 24, padding: '14px 16px', background: '#f9fafb', borderRadius: 10 }}>
            {order.buyer_note && <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}><strong>Buyer note:</strong> {order.buyer_note}</p>}
            {order.farmer_note && <p style={{ fontSize: 12, color: '#6b7280', margin: order.buyer_note ? '6px 0 0' : 0 }}><strong>Farmer note:</strong> {order.farmer_note}</p>}
          </div>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Order Timeline</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeline.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === timeline.length - 1 ? '#15803d' : '#d1fae5', flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>{e.label}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{fmt(e.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            This receipt is generated by KULIMA Platform · Receipt #{receiptNo} · {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
            Kampala, Uganda · kulima.app · Powered by escrow-protected payments
          </p>
        </div>
      </div>
    </>
  );
}
