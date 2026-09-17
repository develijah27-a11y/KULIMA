import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CaseDetailClient } from './CaseDetailClient';

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/auth/signin');

  const [{ data: report }, { data: consultation }] = await Promise.all([
    (supabase.from as any)('disease_reports')
      .select(`
        id, crop_type, symptoms, urgency, district, status, reported_at, created_at,
        pathologist_id, diagnosis, treatment, image_urls, farmer_id, farmer_name,
        farmer:profiles!disease_reports_farmer_id_fkey(id, user_id, full_name, phone_number, location)
      `)
      .eq('id', id)
      .single(),
    (supabase.from as any)('consultations')
      .select('id, type, status, fee_ugx')
      .eq('disease_report_id', id)
      .maybeSingle(),
  ]);

  if (!report) notFound();

  return <CaseDetailClient c={report} profileId={profile.id} consultation={consultation ?? null} />;
}
