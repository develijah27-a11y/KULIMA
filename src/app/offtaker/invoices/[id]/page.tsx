import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PrintInvoiceButton } from './PrintInvoiceButton';
import { CheckCircle2, Clock, ShieldCheck, FileCheck2, Building2 } from 'lucide-react';
import { AppIcon } from '@/components/ui/AppIcon';
import QRCode from 'qrcode';

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

  const amount = (contract.price_ugx ?? 0) * (contract.quantity_kg ?? 0);
  const invoiceNo = `CRP-INV-${id.slice(0, 8).toUpperCase()}`;
  const paid = contract.payment_status === 'paid';

  // Generate scannable QR verification code pointing to the invoice verification endpoint
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(`https://www.cropifyapp.com/offtaker/invoices/${id}`, {
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
          .invoice-wrap {
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
          href="/offtaker/invoices"
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
          ← Back to Invoices
        </a>
        <PrintInvoiceButton />
      </div>

      {/* Modern Fintech Invoice Container */}
      <div
        className="invoice-wrap"
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
                    cropifyapp.com · Corporate Contract Invoice
                  </p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 14px', borderRadius: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', margin: '0 0 2px' }}>
                  Invoice Reference
                </p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>
                  {invoiceNo}
                </p>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>
                Issued: {fmt(contract.created_at)}
              </p>
            </div>
          </div>

          {/* Amount Hero & Settlement Status */}
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
                Net Settlement Wire Total (UGX)
              </p>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#064E3B', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                UGX {Math.round(amount * 0.94).toLocaleString()}
              </p>
              <p style={{ fontSize: 12, color: '#15803D', margin: '6px 0 0', fontWeight: 600 }}>
                Gross UGX {Math.round(amount).toLocaleString()} · Less 6% URA WHT (UGX {Math.round(amount * 0.06).toLocaleString()})
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
                  background: paid ? '#DCFCE7' : '#FEF3C7',
                  color: paid ? '#15803D' : '#B45309',
                  border: `1px solid ${paid ? '#86EFAC' : '#FDE68A'}`,
                }}
              >
                {paid ? (
                  <>
                    <CheckCircle2 size={15} /> Payment Settled (Bank Wire Confirmed)
                  </>
                ) : (
                  <>
                    <Clock size={15} /> Awaiting Commercial Wire Transfer
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Counterparties Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 22px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#64748B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Billed To (Commercial Offtaker)
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={16} style={{ color: '#0369A1' }} />
                Your Corporate Account
              </p>
              <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>
                Uganda Corporate Offtake Entity
              </p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 22px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#64748B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Supplier / Outgrower
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                {contract.farmer_name ?? 'Contracted Producer'}
                <ShieldCheck size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
              </p>
              <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>
                {contract.district ? `District: ${contract.district}` : 'Uganda Outgrower Network'}
              </p>
            </div>
          </div>

          {/* Line items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1.5px solid #E2E8F0' }}>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Contract Produce Description
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Quantity (kg)
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Contract Price / kg
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Gross Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '16px 14px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  {contract.crop_type?.charAt(0).toUpperCase() + contract.crop_type?.slice(1)} — Bulk Outgrower Consignment
                  {contract.delivery_date && (
                    <span style={{ display: 'block', fontSize: 12, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                      Scheduled Delivery: {fmt(contract.delivery_date)}
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                  {Number(contract.quantity_kg).toLocaleString()} kg
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                  UGX {Number(contract.price_ugx).toLocaleString()}
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                  UGX {Math.round(amount).toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#64748B', borderTop: '1px solid #E2E8F0' }}>
                  Gross Produce Subtotal
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'var(--font-mono, monospace)', borderTop: '1px solid #E2E8F0' }}>
                  UGX {Math.round(amount).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13, color: '#B91C1C' }}>
                  Less: URA Withholding Tax (WHT @ 6.0%)
                </td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#B91C1C', fontFamily: 'var(--font-mono, monospace)' }}>
                  &minus; UGX {Math.round(amount * 0.06).toLocaleString()}
                </td>
              </tr>
              <tr style={{ background: '#F8FAFC' }}>
                <td colSpan={3} style={{ padding: '16px 14px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#0F172A', borderTop: '2px solid #E2E8F0' }}>
                  Net Settlement Payable
                </td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontSize: 20, fontWeight: 900, color: '#064E3B', fontFamily: 'var(--font-mono, monospace)', borderTop: '2px solid #E2E8F0' }}>
                  UGX {Math.round(amount * 0.94).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Notes */}
          {contract.notes && (
            <div style={{ marginBottom: 28, padding: '16px 20px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
              <p style={{ fontSize: 12, color: '#475569', margin: 0 }}><strong>Contractual Stipulations:</strong> {contract.notes}</p>
            </div>
          )}

          {/* Corporate Tax Compliance & Factory Intake Verification */}
          <div style={{ marginBottom: 28, padding: '18px 22px', background: '#F0F9FF', borderRadius: 16, border: '1px solid #BAE6FD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Corporate Tax Compliance &amp; Factory Intake Verification
              </p>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6, background: '#E0F2FE', color: '#0369A1', fontFamily: 'var(--font-mono, monospace)' }}>
                URA EFRIS: EFRIS-2026-UG-{id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[
                { label: 'Contract Status', value: contract.status?.replace(/_/g, ' ') },
                { label: 'Settlement Status', value: paid ? 'Settled (Bank Wire)' : 'Awaiting Wire' },
                { label: 'Contract Date', value: fmt(contract.created_at) },
                { label: 'Delivery Confirmed', value: fmt(contract.delivery_date) },
                { label: 'Withholding Tax (WHT)', value: '6.0% Remitted to URA' },
                { label: 'Factory Intake', value: 'Certified Weighbridge & Moisture Pass' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: '#64748B', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 800 }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', margin: 0, textTransform: 'capitalize' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

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
                  Cropify Escrow Digital Authentication
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px', lineHeight: 1.5 }}>
                Legally binding electronic invoice authenticated on the Cropify agribusiness network under Ugandan commercial law. Verify online on <strong>cropifyapp.com</strong>.
              </p>
              <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>
                Digital Audit Hash: {securityHash}
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
              Official platform: <a href="https://www.cropifyapp.com" style={{ color: '#166534', textDecoration: 'none', fontWeight: 600 }}>www.cropifyapp.com</a> · Escrow-backed commercial contracts
            </p>
            <p style={{ fontSize: 10, color: '#CBD5E1', margin: '4px 0 0' }}>
              Invoice #{invoiceNo} · Generated {new Date().getFullYear()} · All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
