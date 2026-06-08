import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { VehicleForm } from './VehicleForm';

const C = {
  text: '#1A1A1A', muted: '#6B7280', cardBg: '#FFFFFF',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

export default async function TransporterVehiclePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const { data: vehicle } = await (supabase.from as any)('vehicles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <Link href="/transporter/dashboard" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <h1 className="text-xl font-black mt-2" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {vehicle ? 'My Vehicle' : 'Register Vehicle'}
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {vehicle ? 'Update your vehicle details and availability' : 'Register your vehicle to start accepting deliveries'}
        </p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <VehicleForm existing={vehicle} />
      </div>
    </div>
  );
}
