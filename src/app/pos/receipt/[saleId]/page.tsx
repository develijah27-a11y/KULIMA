import { redirect } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getPosActor } from '@/lib/pos/getPosActor';
import { PrintButton } from '@/app/buyer/orders/[id]/receipt/PrintButton';
import { CheckCircle2, ShieldCheck, FileCheck2, Store, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { AppIcon } from '@/components/ui/AppIcon';
import QRCode from 'qrcode';

export default async function PosReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const admin = createServiceRoleClient();
  const actor = await getPosActor(admin, user.id);
  if (!actor) redirect('/auth/signin');

  const { data: profile } = await (admin.from as any)('profiles')
    .select('id, full_name, business_name, location, phone_number')
    .eq('id', actor.ownerId)
    .single();
  if (!profile) redirect('/auth/signin');

  const { data: sale } = await (admin.from as any)('pos_sales')
    .select('id, customer_name, customer_phone, subtotal_ugx, discount_ugx, total_ugx, payment_method, status, created_at')
    .eq('id', saleId)
    .eq('supplier_id', actor.ownerId)
    .single();

  if (!sale) redirect('/pos/till');

  const { data: items } = await (admin.from as any)('pos_sale_items')
    .select('id, product_name, sku, quantity, unit_price_ugx, line_total_ugx')
    .eq('pos_sale_id', saleId);

  const receiptNo = `CRP-POS-${saleId.slice(0, 8).toUpperCase()}`;

  // Generate scannable QR verification code
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(`https://www.cropifyapp.com/pos/receipt/${saleId}`, {
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

  const paymentLabel: Record<string, string> = {
    cash: 'Cash Till Settlement',
    wallet: 'Cropify Digital Wallet',
    mobile_money: 'Uganda Mobile Money',
  };

  const PaymentIcon = sale.payment_method === 'cash' ? Banknote : sale.payment_method === 'wallet' ? CreditCard : Smartphone;
  const securityHash = `0x${saleId.replace(/-/g, '').slice(0, 16).toUpperCase()}`;

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
          href="/pos/till"
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
          ← New Till Sale
        </a>
        <PrintButton />
      </div>

      {/* Modern Fintech POS Receipt Container */}
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
                    cropifyapp.com · Point of Sale Receipt
                  </p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 14px', borderRadius: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', margin: '0 0 2px' }}>
                  POS Reference
                </p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>
                  {receiptNo}
                </p>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>
                Issued: {fmt(sale.created_at)}
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
                Total Paid (UGX)
              </p>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#064E3B', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                UGX {Number(sale.total_ugx).toLocaleString()}
              </p>
              <p style={{ fontSize: 12, color: '#15803D', margin: '6px 0 0', fontWeight: 600 }}>
                Processed via {profile.business_name || 'Agro Dealer POS'}
              </p>
            </div>

            <div>
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
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                }}
              >
                <CheckCircle2 size={15} />
                Paid · <PaymentIcon size={14} style={{ display: 'inline', margin: '0 2px' }} /> {paymentLabel[sale.payment_method] ?? sale.payment_method}
              </span>
            </div>
          </div>

          {/* Counterparties Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 22px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#64748B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Customer (Walk-in / Account)
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {sale.customer_name || 'Walk-in Customer'}
              </p>
              <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>
                {sale.customer_phone || 'Cash register sale'}
              </p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 22px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#64748B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Merchant / Store Location
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

          {/* Itemized Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1.5px solid #E2E8F0' }}>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Item Description
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Qty
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
              {(items ?? []).map((it: any) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 14px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                    {it.product_name}
                    {it.sku && (
                      <span style={{ display: 'block', fontSize: 11, color: '#64748B', fontWeight: 500, marginTop: 3 }}>
                        SKU: {it.sku}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                    {Number(it.quantity).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                    UGX {Number(it.unit_price_ugx).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                    UGX {Number(it.line_total_ugx).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#64748B', borderTop: '1px solid #E2E8F0' }}>
                  Subtotal
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'var(--font-mono, monospace)', borderTop: '1px solid #E2E8F0' }}>
                  UGX {Number(sale.subtotal_ugx).toLocaleString()}
                </td>
              </tr>
              {Number(sale.discount_ugx) > 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13, color: '#B91C1C' }}>
                    Discount Deducted
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#B91C1C', fontFamily: 'var(--font-mono, monospace)' }}>
                    &minus; UGX {Number(sale.discount_ugx).toLocaleString()}
                  </td>
                </tr>
              )}
              <tr style={{ background: '#F8FAFC' }}>
                <td colSpan={3} style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#0F172A', borderTop: '2px solid #E2E8F0' }}>
                  Total Paid
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 20, fontWeight: 900, color: '#064E3B', fontFamily: 'var(--font-mono, monospace)', borderTop: '2px solid #E2E8F0' }}>
                  UGX {Number(sale.total_ugx).toLocaleString()}
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
                  Cropify POS Terminal Authenticity Stamp
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px', lineHeight: 1.5 }}>
                Electronic POS sale registered on the Cropify retail till system. Scan to verify transaction entry and stock ledger synchronization on <strong>cropifyapp.com</strong>.
              </p>
              <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>
                Till Hash: {securityHash}
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
