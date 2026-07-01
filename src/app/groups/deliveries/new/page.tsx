import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { RequestDeliveryForm } from '@/app/buyer/deliveries/new/RequestDeliveryForm';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
};

export default async function GroupsRequestDeliveryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('location')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <Link href="/groups/dashboard" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <h1 className="text-xl font-black mt-2" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Request Delivery
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Arrange transport for your group&apos;s produce</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <RequestDeliveryForm
          prefilledOffer={null}
          successRedirect="/groups/dashboard"
          userDistrict={profile?.location ?? undefined}
        />
      </div>
    </div>
  );
}
