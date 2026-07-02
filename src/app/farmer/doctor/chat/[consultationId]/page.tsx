import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DirectMessageClient } from '@/components/chat/DirectMessageClient';

export default async function FarmerConsultationChatPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const { consultationId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Load consultation + pathologist info
  const { data: consultation, error } = await (supabase.from as any)('consultations')
    .select('id, type, status, pathologist_id, pathologist:profiles!consultations_pathologist_id_fkey(full_name, location)')
    .eq('id', consultationId)
    .eq('farmer_id', user.id)
    .single();

  if (error || !consultation) redirect('/farmer/doctor');

  if (!consultation.pathologist_id) {
    return (
      <div className="max-w-xl mx-auto" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>⏳</p>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--d-text)', marginBottom: 6 }}>Matching a pathologist…</p>
        <p style={{ fontSize: 13, color: 'var(--d-muted)' }}>
          We are finding the nearest available plant pathologist in your region. You will receive a notification when matched.
        </p>
      </div>
    );
  }

  const { data: farmerProfile } = await supabase
    .from('profiles').select('full_name').eq('user_id', user.id).single();

  const pathologist = consultation.pathologist as any;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-black" style={{ color: 'var(--d-text)', letterSpacing: '-0.03em' }}>
          Consultation Chat
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--d-muted)' }}>
          {consultation.type === 'farm_visit' ? 'Farm Visit' : 'Remote'} · {consultation.status}
        </p>
      </div>
      <DirectMessageClient
        meId={user.id}
        meName={farmerProfile?.full_name ?? 'Farmer'}
        themId={consultation.pathologist_id}
        themName={pathologist?.full_name ?? 'Pathologist'}
        themSubtitle={`Plant Pathologist · ${pathologist?.location ?? 'Uganda'}`}
      />
    </div>
  );
}
