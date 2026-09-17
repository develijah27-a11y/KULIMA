import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OfftakerInvoicesClient } from './OfftakerInvoicesClient';

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: contracts } = await (supabase.from as any)('offtaker_contracts')
    .select('id, crop_type, quantity_kg, price_ugx, farmer_name, district, delivery_date, payment_status, status')
    .eq('offtaker_id', user.id)
    .eq('status', 'completed')
    .order('delivery_date', { ascending: false })
    .limit(30);

  const rows = (contracts ?? []) as any[];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1
          className="text-xl font-black"
          style={{
            color: 'var(--d-text)',
            letterSpacing: '-0.03em',
            fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
          }}
        >
          Contract Invoices
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--d-muted)' }}>
          Manage corporate tax invoices, withholding tax (WHT @ 6%), and bank wire disbursements
        </p>
      </div>

      <OfftakerInvoicesClient rows={rows} />
    </div>
  );
}

