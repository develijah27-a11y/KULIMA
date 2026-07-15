import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VerifyWizard } from './VerifyWizard';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { TrustScore } from '@/components/trust/TrustScore';
import { BADGE_CONFIG, type VerificationLevel } from '@/lib/trust';
import { Smartphone, Check, Gem, Star } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
};

const LEVELS: VerificationLevel[] = ['grey', 'green', 'blue', 'gold'];

const ROLE_HEADER: Record<string, { title: string; subtitle: string }> = {
  farmer:      { title: 'Get Verified, Sell with Confidence', subtitle: 'Verified farmers get more views, more trust, and access to escrow-protected sales and loans.' },
  buyer:       { title: 'Get Verified, Buy with Confidence',  subtitle: 'Verified buyers get faster order approval and access to bulk sourcing and group listings.' },
  transporter: { title: 'Get Verified, Start Earning',        subtitle: 'Verified drivers unlock paid delivery jobs, higher job-match priority, and protected fare payouts.' },
  supplier:    { title: 'Get Verified, Reach More Farmers',   subtitle: 'Verified suppliers rank higher in search and unlock flash deals and escrow-protected sales.' },
  pathologist: { title: 'Get Certified, Start Consulting',    subtitle: 'Certified pathologists get matched to paid consultations and unlock higher fees.' },
  offtaker:    { title: 'Get Verified, Source with Confidence', subtitle: 'Verified offtakers can sign escrow-backed contracts and access bulk group harvests.' },
};
const DEFAULT_HEADER = { title: 'Verification & Trust', subtitle: 'Get verified to unlock escrow deals, financing, and buyer trust.' };

export async function VerifyPageContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [{ data: profile }, { data: pending }, { data: latest }] = await Promise.all([
    (supabase.from as any)('profiles')
      .select('id, role, verification_level, trust_score, reliability_score, completed_deals')
      .eq('user_id', user.id)
      .single(),
    (supabase.from as any)('verifications')
      .select('id, level, status, submitted_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Most recent submission overall — if it was rejected and nothing newer
    // has been submitted since, show the reason so the user knows what to fix.
    (supabase.from as any)('verifications')
      .select('id, level, status, rejection_reason, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const rejection = latest?.status === 'rejected' ? latest : null;

  const currentLevel: VerificationLevel = (profile as any)?.verification_level ?? 'grey';
  const trustScore   = (profile as any)?.trust_score ?? 50;
  const deals        = (profile as any)?.completed_deals ?? 0;
  const currentIdx   = LEVELS.indexOf(currentLevel);
  const role         = (profile as any)?.role ?? '';
  const header       = ROLE_HEADER[role] ?? DEFAULT_HEADER;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          {header.title}
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          {header.subtitle}
        </p>
      </div>

      {/* Current status card */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>

        {/* Card header — subtle gradient stripe */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-sky-bg) 100%)',
          borderBottom: `1px solid ${C.border}`,
          padding: '14px 20px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
            Your Status
          </p>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Two-column grid: verification level | trust score */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Left: badge */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Level
              </p>
              <VerificationBadge level={currentLevel} size="md" />
              <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                {BADGE_CONFIG[currentLevel].description}
              </p>
            </div>

            {/* Right: trust ring — vertical layout fits any column width */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>
                Trust
              </p>
              <TrustScore score={trustScore} deals={deals} size="sm" />
            </div>
          </div>

          {/* Progress path — full width below the grid */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Verification Path
            </p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {LEVELS.map((lvl, i) => {
                const cfg    = BADGE_CONFIG[lvl];
                const done   = i <= currentIdx;
                const isCurr = lvl === currentLevel;
                return (
                  <div key={lvl} style={{ display: 'flex', alignItems: 'center', flex: i < LEVELS.length - 1 ? 1 : 'none' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: done ? cfg.bg : 'var(--color-surface-2)',
                      border: `2px solid ${done ? cfg.border : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: done ? cfg.color : C.muted,
                      fontWeight: 800, flexShrink: 0,
                      boxShadow: isCurr ? `0 0 0 4px ${cfg.border}` : 'none',
                      transition: 'box-shadow 200ms ease',
                    }}>
                      {done
                        ? (lvl === 'grey'  ? <Smartphone size={15} />
                          : lvl === 'green' ? <Check size={15} />
                          : lvl === 'blue'  ? <Gem size={15} />
                          : <Star size={15} />)
                        : <span style={{ fontSize: 13 }}>{i + 1}</span>}
                    </div>
                    {i < LEVELS.length - 1 && (
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: done && i < currentIdx ? cfg.color : C.border }} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Labels below stepper — readable font size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {LEVELS.map((lvl, i) => (
                <p key={lvl} style={{
                  fontSize: 10, fontWeight: 700, color: i <= currentIdx ? BADGE_CONFIG[lvl].color : C.muted,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  width: 36, textAlign: 'center',
                }}>
                  {lvl === 'grey' ? 'Phone' : lvl === 'green' ? 'ID' : lvl === 'blue' ? 'KYC' : 'Gold'}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wizard */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '24px' }}>
        {currentLevel === 'gold' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-harvest)' }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: '12px 0 4px' }}>Enterprise Verified</p>
            <p style={{ color: C.muted, fontSize: 14 }}>You have the highest verification level on AgriNova.</p>
          </div>
        ) : (
          <VerifyWizard
            userId={user.id}
            profileId={(profile as any)?.id ?? ''}
            role={(profile as any)?.role ?? 'farmer'}
            currentLevel={currentLevel}
            hasPending={!!pending}
            rejection={rejection ? { level: rejection.level, reason: rejection.rejection_reason ?? null } : null}
          />
        )}
      </div>
    </div>
  );
}
