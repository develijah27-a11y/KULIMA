import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { NewFarmForm } from './NewFarmForm';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
};

export default async function NewFarmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <Link href="/farmer/farm" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>
          ← My Farms
        </Link>
        <h1 className="text-xl font-black mt-2" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Register Farm
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Add farm details and optionally map its GPS boundary</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <NewFarmForm />
      </div>
    </div>
  );
}
