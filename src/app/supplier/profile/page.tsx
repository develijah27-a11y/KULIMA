import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SupplierProfileForm } from './SupplierProfileForm';

export default async function SupplierProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, phone_number, location')
    .eq('user_id', user.id)
    .single();

  return (
    <SupplierProfileForm
      initial={{
        fullName: (profile as any)?.full_name ?? '',
        businessName: (profile as any)?.business_name ?? '',
        phoneNumber: (profile as any)?.phone_number ?? '',
        location: (profile as any)?.location ?? '',
      }}
    />
  );
}
