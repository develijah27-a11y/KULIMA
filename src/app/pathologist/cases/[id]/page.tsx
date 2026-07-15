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

  const { data: report } = await (supabase.from as any)('disease_reports')
    .select('id, crop_type, symptoms, urgency, district, status, reported_at, created_at, pathologist_id, diagnosis, treatment, image_urls')
    .eq('id', id)
    .single();

  if (!report) notFound();

  return <CaseDetailClient c={report} profileId={profile.id} />;
}
