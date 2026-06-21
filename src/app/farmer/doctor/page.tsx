import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PathologistLazy as PathologistClient } from './PathologistLazy';
import { ConsultationBooking } from './ConsultationBooking';

export default async function PathologistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [walletRes, consultationsRes] = await Promise.all([
    (supabase.from as any)('wallets').select('balance').eq('user_id', user.id).single(),
    (supabase.from as any)('consultations')
      .select('id, type, status, fee_ugx, notes, created_at, pathologist:profiles!consultations_pathologist_id_fkey(full_name, location)')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const walletBalance  = Number(walletRes.data?.balance ?? 0);
  const consultations  = (consultationsRes.data ?? []) as any[];

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--d-text)', letterSpacing: '-0.03em', margin: 0 }}>
              Plant Pathologist
            </h1>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
              background: 'var(--color-success-bg)', color: 'var(--color-success)',
            }}>
              AI-Powered
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--d-muted)', margin: 0 }}>
            Upload a photo for AI diagnosis, or book a paid consultation with a real pathologist
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
          background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: '10px',
          fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600,
        }}>
          🌿 Covers 6 major Uganda crop diseases
        </div>
      </div>

      {/* AI Disease Scanner */}
      <PathologistClient />

      {/* Paid consultation booking */}
      <ConsultationBooking walletBalance={walletBalance} consultations={consultations} />

    </div>
  );
}
