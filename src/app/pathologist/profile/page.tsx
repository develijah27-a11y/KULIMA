import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

export default async function PathologistProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles')
    .select('full_name, location, verification_level, trust_score, primary_crop, phone_number')
    .eq('user_id', user.id)
    .single();

  const p = profile as any;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Professional Profile</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Your pathologist credentials and public profile</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: C.green, flexShrink: 0 }}>
            {p?.full_name?.[0]?.toUpperCase() ?? 'P'}
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 4px', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Dr. {p?.full_name ?? 'Pathologist'}</p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Plant Pathologist · {p?.location ?? 'Uganda'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Full Name', value: p?.full_name, placeholder: 'Set your name' },
            { label: 'Location', value: p?.location, placeholder: 'Add your district' },
            { label: 'Phone', value: p?.phone_number, placeholder: 'Add phone number' },
          ].map(({ label, value, placeholder }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: value ? C.text : C.muted, margin: 0 }}>{value ?? placeholder}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Verification</p>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed }}>
              {p?.verification_level ?? 'Pending'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Specialisation</p>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Set which crop diseases and regions you specialise in to get matched with relevant cases.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/pathologist/settings" style={{ flex: 1, padding: '10px', background: 'var(--color-primary-bg)', color: C.greenMed, borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
            Edit Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}
