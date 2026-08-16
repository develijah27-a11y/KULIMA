import { redirect } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getPosActor } from '@/lib/pos/getPosActor';
import { PrintButton } from '@/app/buyer/orders/[id]/receipt/PrintButton';
import { CheckCircle2 } from 'lucide-react';

export default async function PosReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // A staff member who rang up this sale needs to see/print it too — their
  // own profiles.id has nothing to do with pos_sales.supplier_id (that's
  // always the store owner's), so ownership is resolved via getPosActor
  // instead of a direct profile-id match.
  const admin = createServiceRoleClient();
  const actor = await getPosActor(admin, user.id);
  if (!actor) redirect('/auth/signin');

  const { data: profile } = await (admin.from as any)('profiles').select('id, full_name, business_name, location, phone_number').eq('id', actor.ownerId).single();
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

  const receiptNo = `POS-${saleId.slice(0, 8).toUpperCase()}`;
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const paymentLabel: Record<string, string> = { cash: 'Cash', wallet: 'Cropify Wallet', mobile_money: 'Mobile Money' };

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
        <a href="/pos/till" style={{ fontSize: 13, color: 'var(--d-muted)', fontWeight: 600, textDecoration: 'none' }}>← New sale</a>
        <PrintButton />
      </div>

      <div className="receipt-wrap" style={{
        maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 40px rgba(0,0,0,0.10)', padding: '40px 44px',
        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", color: '#111',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 26, fontWeight: 900, color: '#15803d', margin: 0, letterSpacing: '-0.03em' }}>CROPIFY</p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>Point of Sale Receipt</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111' }}>RECEIPT</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', margin: '4px 0 0' }}>{receiptNo}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Issued: {fmt(sale.created_at)}</p>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
            <CheckCircle2 size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
            Paid — {paymentLabel[sale.payment_method] ?? sale.payment_method}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32, padding: '20px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sold To</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>{sale.customer_name || 'Walk-in customer'}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{sale.customer_phone ?? ''}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sold By</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>{profile.business_name || profile.full_name || 'Agro Dealer'}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{profile.location ?? 'Uganda'}{profile.phone_number ? ` · ${profile.phone_number}` : ''}</p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Item', 'Qty', 'Unit Price', 'Amount'].map(h => (
                <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textAlign: h === 'Item' ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it: any) => (
              <tr key={it.id}>
                <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#111', borderBottom: '1px solid #f9fafb' }}>
                  {it.product_name}{it.sku && <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>SKU: {it.sku}</span>}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>{Number(it.quantity).toLocaleString()}</td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, color: '#374151', borderBottom: '1px solid #f9fafb' }}>UGX {Number(it.unit_price_ugx).toLocaleString()}</td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#111', borderBottom: '1px solid #f9fafb' }}>UGX {Number(it.line_total_ugx).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: '6px 12px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>Subtotal</td>
              <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 13, color: '#374151' }}>UGX {Number(sale.subtotal_ugx).toLocaleString()}</td>
            </tr>
            {Number(sale.discount_ugx) > 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '6px 12px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>Discount</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 13, color: '#374151' }}>&minus; UGX {Number(sale.discount_ugx).toLocaleString()}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ padding: '14px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#374151' }}>Total</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 18, fontWeight: 900, color: '#15803d' }}>UGX {Number(sale.total_ugx).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            This receipt is generated by Cropify Platform · Receipt #{receiptNo} · {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
            Kampala, Uganda · www.cropifyapp.com
          </p>
        </div>
      </div>
    </>
  );
}
