import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { TrustScore } from '@/components/trust/TrustScore';
import { type VerificationLevel } from '@/lib/trust';
import { ProfileEditForm } from './ProfileEditForm';
import { Lock, ArrowUp, Leaf } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)',
};

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, ...style }}>{children}</div>
);

async function getFarms(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('farms').select('id, name, size_hectares').eq('user_id', userId);
  return data ?? [];
}

async function getCrops(userId: string) {
  const supabase = await createClient();
  const { data: farms } = await supabase.from('farms').select('id').eq('user_id', userId);
  const ids = (farms ?? []).map((f: any) => f.id);
  if (!ids.length) return [];
  const { data } = await supabase.from('crops').select('id, crop_name, status, planting_date').in('farm_id', ids).order('created_at', { ascending: false }).limit(8);
  return data ?? [];
}

export default async function FarmerProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [profileRes, farms, crops] = await Promise.all([
    (supabase.from as any)('profiles')
      .select('full_name, business_name, phone_number, location, primary_crop, role, verification_level, trust_score, completed_deals')
      .eq('user_id', user.id)
      .single(),
    getFarms(user.id),
    getCrops(user.id),
  ]);

  const p = profileRes.data ?? {} as any;
  const level: VerificationLevel = p.verification_level ?? 'grey';
  const trust = p.trust_score ?? 50;
  const deals = p.completed_deals ?? 0;

  const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    growing:   { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    harvested: { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
    planted:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  };

  const editInitial = {
    full_name:     p.full_name     ?? '',
    business_name: p.business_name ?? '',
    phone_number:  p.phone_number  ?? '',
    location:      p.location      ?? '',
    primary_crop:  p.primary_crop  ?? '',
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          My Profile
        </h1>
        <ProfileEditForm initial={editInitial} />
      </div>

      {/* Identity card */}
      <Card>
        <div className="p-6">
          {/* Name row — TrustScore NOT placed here so it never crowds the name */}
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
              style={{ background: C.green }}
            >
              {p.full_name?.[0]?.toUpperCase() ?? 'F'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black truncate" style={{ color: C.text, letterSpacing: '-0.02em', marginBottom: 4 }}>{p.full_name ?? '—'}</p>
              <VerificationBadge level={level} size="sm" />
              <p className="text-sm mt-2" style={{ color: C.muted }}>{p.phone_number ?? '—'} · {p.location ?? '—'}</p>
              {p.primary_crop && (
                <p className="text-xs mt-1" style={{ color: C.muted }}>Primary crop: <strong style={{ color: C.text, textTransform: 'capitalize' }}>{p.primary_crop}</strong></p>
              )}
            </div>
          </div>

          {/* Trust score — own row below so it never overlaps the name */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.muted }}>Trust Score</p>
            <TrustScore score={trust} deals={deals} size="sm" />
          </div>

          {/* Verify CTA */}
          {level !== 'gold' && (
            <Link
              href="/farmer/verify"
              style={{
                display: 'block', marginTop: 16, padding: '10px 16px',
                background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-muted)',
                borderRadius: 10, textDecoration: 'none', textAlign: 'center',
              }}
            >
              <p className="text-sm font-bold" style={{ color: C.green, margin: 0 }}>
                {level === 'grey' ? <><Lock size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Get verified to unlock deals &amp; financing →</> : <><ArrowUp size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Upgrade your verification →</>}
              </p>
            </Link>
          )}
        </div>
      </Card>

      {/* Personal details */}
      <Card>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Personal Information</p>
        </div>
        <div className="divide-y" style={{ borderColor: C.border }}>
          {[
            { label: 'Full Name',   value: p.full_name },
            { label: 'Business Name', value: p.business_name },
            { label: 'Phone',       value: p.phone_number },
            { label: 'District',    value: p.location },
            { label: 'Primary Crop', value: p.primary_crop },
            { label: 'Role',        value: p.role },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-center justify-between">
              <p className="text-sm" style={{ color: C.muted }}>{label}</p>
              <p className="text-sm font-semibold capitalize" style={{ color: C.text }}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* My farms */}
      <Card>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>My Farms ({farms.length})</p>
          <Link href="/farmer/farm" className="text-xs font-semibold" style={{ color: 'var(--color-primary-hover)', textDecoration: 'none' }}>Manage →</Link>
        </div>
        {farms.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--d-muted)' }}><Leaf size={40} /></div>
            <p className="text-sm" style={{ color: C.muted }}>No farms registered yet</p>
            <Link href="/farmer/farm" className="text-xs font-semibold mt-2 inline-block" style={{ color: 'var(--color-primary-hover)', textDecoration: 'none' }}>Add your first farm →</Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {farms.map((f: any) => (
              <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: C.text }}>{f.name}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-primary-hover)' }}>
                  {f.size_hectares ? `${f.size_hectares} ha` : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent crops */}
      {crops.length > 0 && (
        <Card>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>Crop History</p>
          </div>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {crops.map((c: any) => {
              const sc = STATUS_COLORS[c.status?.toLowerCase()] ?? { color: C.muted, bg: 'var(--color-surface-2)' };
              return (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-semibold capitalize" style={{ color: C.text }}>{c.crop_name}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
