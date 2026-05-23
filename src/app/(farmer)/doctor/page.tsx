import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DoctorUploadClient } from './DoctorUploadClient';

export default async function DoctorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <DoctorClient farmerId={user.id} />;
}

function DoctorClient({ farmerId }: { farmerId: string }) {
  return <DoctorUploadClient farmerId={farmerId} />;
}
