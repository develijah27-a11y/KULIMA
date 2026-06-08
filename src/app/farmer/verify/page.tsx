import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VerifyWizard } from './VerifyWizard';
import { VerificationBadge } from '@/components/trust/VerificationBadge';
import { TrustScore } from '@/components/trust/TrustScore';
import { BADGE_CONFIG, type VerificationLevel } from '@/lib/trust';

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB', cardBg: '#FFFFFF',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

const LEVELS: VerificationLevel[] = ['grey', 'green', 'blue', 'gold'];

export default async function VerifyPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id, role, verification_level, trust_score, reliability_score, completed_deals')
    .eq('user_id', session.user.id)
    .single();

  const { data: pending } = await (supabase.from as any)('verifications')
    .select('id, level, status, submitted_at')
    .eq('user_id', session.user.id)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentLevel: VerificationLevel = (profile as any)?.verification_level ?? 'grey';
  const trustScore   = (profile as any)?.trust_score ?? 50;
  const deals        = (profile as any)?.completed_deals ?? 0;
  const currentIdx   = LEVELS.indexOf(currentLevel);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Verification & Trust
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          Get verified to unlock escrow deals, financing, and buyer trust.
        </p>
      </div>

      {/* Current status */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px 24px' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.muted }}>Your Status</p>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: C.muted }}>Verification Level</p>
            <VerificationBadge level={currentLevel} size="md" />
            <p className="text-xs mt-1.5" style={{ color: C.muted }}>{BADGE_CONFIG[currentLevel].description}</p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: C.muted }}>Trust Score</p>
            <TrustScore score={trustScore} deals={deals} size="md" />
          </div>
          {/* Progress bar */}
          <div className="w-full">
            <p className="text-xs font-semibold mb-2" style={{ color: C.muted }}>Verification path</p>
            <div className="flex items-center gap-0">
              {LEVELS.map((lvl, i) => {
                const cfg     = BADGE_CONFIG[lvl];
                const done    = i <= currentIdx;
                const isCurr  = lvl === currentLevel;
                return (
                  <div key={lvl} className="flex items-center" style={{ flex: i < LEVELS.length - 1 ? 1 : 'none' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: done ? cfg.bg : '#F3F4F6',
                      border: `2px solid ${done ? cfg.border : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: done ? cfg.color : C.muted,
                      fontWeight: 700, flexShrink: 0,
                      boxShadow: isCurr ? `0 0 0 3px ${cfg.border}` : 'none',
                    }}>
                      {done ? (lvl === 'grey' ? '📱' : lvl === 'green' ? '✓' : lvl === 'blue' ? '◆' : '★') : i + 1}
                    </div>
                    {i < LEVELS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: done && i < currentIdx ? cfg.color : C.border }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              {LEVELS.map(lvl => (
                <p key={lvl} style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {BADGE_CONFIG[lvl].label}
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
            <p style={{ fontSize: 48 }}>🌟</p>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: '12px 0 4px' }}>Enterprise Verified</p>
            <p style={{ color: C.muted, fontSize: 14 }}>You have the highest verification level on Kulima.</p>
          </div>
        ) : (
          <VerifyWizard
            userId={session.user.id}
            profileId={(profile as any)?.id ?? ''}
            role={(profile as any)?.role ?? 'farmer'}
            currentLevel={currentLevel}
            hasPending={!!pending}
          />
        )}
      </div>
    </div>
  );
}
