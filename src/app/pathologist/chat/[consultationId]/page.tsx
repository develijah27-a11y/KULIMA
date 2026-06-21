import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DirectMessageClient } from '@/components/chat/DirectMessageClient';

export default async function PathologistConsultationChatPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const { consultationId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Load consultation + farmer info
  const { data: consultation, error } = await (supabase.from as any)('consultations')
    .select('id, type, status, fee_ugx, farmer_id, farmer_district, notes, farmer:profiles!consultations_farmer_id_fkey(full_name, location)')
    .eq('id', consultationId)
    .eq('pathologist_id', user.id)
    .single();

  if (error || !consultation) redirect('/pathologist/cases');

  const { data: myProfile } = await supabase
    .from('profiles').select('full_name').eq('user_id', user.id).single();

  const farmer = consultation.farmer as any;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Consultation context */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--color-primary-bg)', borderRadius: 12, display: 'flex', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {consultation.type === 'farm_visit' ? '🚗 Farm Visit Request' : '📱 Remote Consultation'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--d-text)', margin: 0 }}>
            {farmer?.location ?? consultation.farmer_district ?? 'Unknown district'}
          </p>
          {consultation.notes && (
            <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>
              &ldquo;{consultation.notes}&rdquo;
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: 'var(--d-muted)', margin: 0 }}>Your fee</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
            UGX {Math.round(Number(consultation.fee_ugx) * 0.8).toLocaleString()}
          </p>
        </div>
      </div>

      <DirectMessageClient
        meId={user.id}
        meName={myProfile?.full_name ?? 'Pathologist'}
        themId={consultation.farmer_id}
        themName={farmer?.full_name ?? 'Farmer'}
        themSubtitle={`Farmer · ${farmer?.location ?? 'Uganda'}`}
      />
    </div>
  );
}
