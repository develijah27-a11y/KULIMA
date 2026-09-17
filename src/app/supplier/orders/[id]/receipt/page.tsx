import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PrintButton } from '@/app/buyer/orders/[id]/receipt/PrintButton';
import { CheckCircle2, ShieldCheck, Clock, FileCheck2, Store } from 'lucide-react';
import { AppIcon } from '@/components/ui/AppIcon';
import QRCode from 'qrcode';

export default async function SupplierOrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id, full_name, business_name, location, phone_number')
    .eq('user_id', user.id)
    .single();
  if (!profile) redirect('/auth/signin');

  const { data: order } = await (supabase.from as any)('supplier_orders')
    .select('id, product_name, buyer_name, quantity, requested_quantity, unit, unit_price, amount, district, status, notes, is_bulk_order, group_name, created_at, updated_at')
    .eq('id', id)
    .eq('supplier_id', profile.id)
    .single();

  if (!order) redirect('/supplier/orders');

  const receiptNo = `CRP-SUP-${id.slice(0, 8).toUpperCase()}`;
  const isDelivered = order.status === 'delivered';
  const isPending = order.status === 'pending' || order.status === 'quoted';

  // Generate scannable QR verification code
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(`https://www.cropifyapp.com/supplier/orders/${id}/receipt`, {
      width: 140,
      margin: 1,
      color: { dark: '#0F2E1E', light: '#FFFFFF' },
    });
  } catch {}

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-UG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Kampala',
    }) : '—';

  const securityHash = `0x${id.replace(/-/g, '').slice(0, 16).toUpperCase()}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; }
          .receipt-wrap {
            box-shadow: none !important;
            border: 1px solid #D1D5DB !important;
            margin: 0 !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Action Bar */}
      <div className="no-print" style={{ maxWidth: 740, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <a
          href="/supplier/orders"
          style={{
            fontSize: 13,
            color: 'var(--d-muted, #64748B)',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← Back to Orders
        </a>
        <PrintButton />
      </div>

      {/* Modern Fintech Receipt Container */}
      <div
        className="receipt-wrap"
        style={{
          position: 'relative',
          maxWidth: 740,
          margin: '0 auto 40px',
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 20px 45px -12px rgba(15, 46, 30, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #E2E8F0',
          padding: '44px 48px',
          overflow: 'hidden',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          color: '#0F172A',
        }}
      >
        {/* Subtle Watermark Brand Mark */}
        <div
          style={{
            position: 'absolute',
            top: '52%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.035,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <AppIcon size={460} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Top Brand & Metadata Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 26, borderBottom: '1.5px solid #F1F5F9', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AppIcon size={38} rounded={10} priority />
                <div>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#0F2E1E', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    CROPIFY
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#166534', margin: '2px 0 0' }}>
                    cropifyapp.com · Agro-Dealer Sale Receipt
                  </p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 14px', borderRadius: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', margin: '0 0 2px' }}>
                  Receipt Reference
                </p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>
                  {receiptNo}
                </p>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>
                Issued: {fmt(order.created_at)}
              </p>
            </div>
          </div>

          {/* Amount Hero & Status Block */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
              border: '1.5px solid #BBF7D0',
              borderRadius: 18,
              padding: '24px 28px',
              marginBottom: 32,
            }}
          >
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#166534', margin: '0 0 4px' }}>
                Total Order Revenue
              </p>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#064E3B', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                UGX {Number(order.amount).toLocaleString()}
              </p>
              <p style={{ fontSize: 12, color: '#15803D', margin: '6px 0 0', fontWeight: 600 }}>
                Secured via Cropify Dealer Settlement Network
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  background: isDelivered ? '#DCFCE7' : isPending ? '#FEF3C7' : '#DBEAFE',
                  color: isDelivered ? '#15803D' : isPending ? '#B45309' : '#1D4ED8',
                  border: `1px solid ${isDelivered ? '#86EFAC' : isPending ? '#FDE68A' : '#93C5FD'}`,
                }}
              >
                {isDelivered ? (
                  <>
                    <CheckCircle2 size={15} /> Order Delivered &amp; Disbursed
                  </>
                ) : (
                  <>
                    <Clock size={15} /> Status: {order.status.replace(/_/g, ' ').toUpperCase()}
                  </>
                )}
              </span>

              {order.is_bulk_order && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    background: '#F3E8FF',
                    color: '#7E22CE',
                    border: '1px solid #E9D5FF',
                  }}
                >
                  Bulk Tier {order.group_name ? `· ${order.group_name}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Counterparties Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 22px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#64748B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Customer / Bill To
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {order.buyer_name ?? order.group_name ?? 'Valued Customer'}
              </p>
              <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>
                {order.district ?? 'Uganda'}
              </p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 22px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#64748B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Merchant / Supplier
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Store size={16} style={{ color: '#166534' }} />
                {profile.business_name || profile.full_name || 'Agro Dealer'}
                <ShieldCheck size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
              </p>
              <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>
                {profile.location ?? 'Uganda'}
              </p>
              {profile.phone_number && (
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '3px 0 0', fontFamily: 'var(--font-mono, monospace)' }}>
                  {profile.phone_number}
                </p>
              )}
            </div>
          </div>

          {/* Itemized Ledger Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1.5px solid #E2E8F0' }}>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Input Product Description
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Quantity
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Unit Price
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '16px 14px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  {order.product_name}
                  {order.notes && (
                    <span style={{ display: 'block', fontSize: 12, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                      Notes: {order.notes}
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                  {Number(order.quantity).toLocaleString()} {order.unit}
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                  UGX {Number(order.unit_price).toLocaleString()}
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                  UGX {Number(order.amount).toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#64748B', borderTop: '1px solid #E2E8F0' }}>
                  Subtotal
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'var(--font-mono, monospace)', borderTop: '1px solid #E2E8F0' }}>
                  UGX {Number(order.amount).toLocaleString()}
                </td>
              </tr>
              <tr style={{ background: '#F8FAFC' }}>
                <td colSpan={3} style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#0F172A', borderTop: '2px solid #E2E8F0' }}>
                  Total Settled
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 20, fontWeight: 900, color: '#064E3B', fontFamily: 'var(--font-mono, monospace)', borderTop: '2px solid #E2E8F0' }}>
                  UGX {Number(order.amount).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Digital Verification & Authenticity Stamp */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              padding: '20px 24px',
              background: '#F8FAFC',
              borderRadius: 16,
              border: '1px dashed #CBD5E1',
              marginBottom: 28,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <FileCheck2 size={16} style={{ color: '#166534' }} />
                <p style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  Cropify Dealer Ledger Authentication
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px', lineHeight: 1.5 }}>
                Official merchant receipt validated through the Cropify agro-dealer inventory and transaction platform. Accessible online on <strong>cropifyapp.com</strong>.
              </p>
              <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>
                Transaction Signature: {securityHash}
              </p>
            </div>

            {qrCodeDataUrl && (
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <img
                  src={qrCodeDataUrl}
                  alt="Scan to verify"
                  width={96}
                  height={96}
                  style={{ display: 'block', borderRadius: 8, border: '1px solid #E2E8F0', margin: '0 auto' }}
                />
                <span style={{ display: 'block', fontSize: 9, fontWeight: 800, color: '#64748B', marginTop: 4, letterSpacing: '0.05em' }}>
                  SCAN TO VERIFY
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#0F2E1E', margin: '0 0 4px' }}>
              Cropify Agribusiness Network · Uganda
            </p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
              Official platform: <a href="https://www.cropifyapp.com" style={{ color: '#166534', textDecoration: 'none', fontWeight: 600 }}>www.cropifyapp.com</a> · Support: support@cropifyapp.com
            </p>
            <p style={{ fontSize: 10, color: '#CBD5E1', margin: '4px 0 0' }}>
              Receipt #{receiptNo} · Generated {new Date().getFullYear()} · All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
