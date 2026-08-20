import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DISTRICT_NAMES } from '@/lib/districts';
import { CoverageDistrictsEditor } from './CoverageDistrictsEditor';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const DISTRICTS = DISTRICT_NAMES;

export default async function SupplierCoveragePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('location, coverage_districts').eq('user_id', user.id).single();
  const homeDistrict = (profile as any)?.location ?? '';
  const coverageDistricts: string[] = (profile as any)?.coverage_districts ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>My Service Area</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Districts where you deliver farm supplies</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <p className="text-sm font-bold mb-1" style={{ color: C.text }}>Your Home District</p>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Your primary operating location from your profile</p>
        <div style={{ padding: '10px 16px', background: 'var(--color-primary-bg)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', color: 'var(--color-primary)' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.green, margin: 0 }}>{homeDistrict || 'Not set — update your profile'}</p>
        </div>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <p className="text-sm font-bold mb-1" style={{ color: C.text }}>Additional Coverage Districts</p>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Farmers in these districts can see your products and place orders</p>
        <CoverageDistrictsEditor districts={DISTRICTS} homeDistrict={homeDistrict} initialSelected={coverageDistricts} />
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>All Uganda Districts</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Farmers from these districts are active on Cropify</p>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DISTRICTS.map(d => (
            <span key={d} style={{
              padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: d === homeDistrict ? 'var(--color-primary-bg)' : 'var(--color-surface-2)',
              color: d === homeDistrict ? C.green : C.muted,
              border: d === homeDistrict ? `1px solid ${C.green}` : '1px solid transparent',
            }}>
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
