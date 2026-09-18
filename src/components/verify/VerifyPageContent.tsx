import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VerifyWizard } from './VerifyWizard';
import { PhoneVerifyStep } from './PhoneVerifyStep';
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

interface Props {
  /** Which role dashboard this verify page was reached from — an account
   *  with more than one role (e.g. a farmer who also registered as a
   *  supplier) needs each role verified separately, since "verified" on one
   *  hat says nothing about the documents backing the other. Falls back to
   *  the account's primary role if omitted, for any caller that hasn't been
   *  updated to pass it explicitly. */
  role?: string;
}

export async function VerifyPageContent({ role: roleProp }: Props = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await (supabase.from as any)('profiles')
    .select('id, role, roles, verification_level, role_verification_levels, trust_score, reliability_score, completed_deals, phone_number, phone_verified')
    .eq('user_id', user.id)
    .single();

  const primaryRole = (profile as any)?.role ?? '';
  const userRoles: string[] = (profile as any)?.roles ?? [];
  const isAdmin = primaryRole === 'admin' || userRoles.includes('admin');
  const role = roleProp || primaryRole;

  if (isAdmin) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '32px 24px', textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Gem size={32} />
          </div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            Administrator Account
          </h1>
          <p style={{ color: C.muted, fontSize: 14, maxWidth: 460, margin: '8px auto 24px', lineHeight: 1.5 }}>
            As a Cropify System Administrator, your account has full administrative privileges and is permanently exempt from user KYC document submission.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/admin/verification"
              style={{
                background: 'var(--color-primary)', color: '#ffffff', padding: '10px 20px',
                borderRadius: 10, fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
              }}
            >
              Go to KYC Review Queue →
            </a>
            <a
              href="/admin/dashboard"
              style={{
                background: 'var(--color-surface-2)', color: C.text, padding: '10px 20px',
                borderRadius: 10, fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
                border: `1px solid ${C.border}`,
              }}
            >
              Admin Overview
            </a>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: pending }, { data: latest }, { data: allUserVerifications }] = await Promise.all([
    (supabase.from as any)('verifications')
      .select('id, level, status, submitted_at')
      .eq('user_id', user.id)
      .eq('role', role)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Most recent submission overall for THIS role
    (supabase.from as any)('verifications')
      .select('id, level, status, rejection_reason, submitted_at')
      .eq('user_id', user.id)
      .eq('role', role)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Query all prior document URLs across submissions for this user to enable zero-duplicate re-uploading
    (supabase.from as any)('verifications')
      .select(`
        national_id_url, selfie_url, business_reg_url,
        driving_permit_url, vehicle_reg_url, insurance_url,
        vehicle_photo_url, qualifications_url
      `)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(10),
  ]);

  const existingDocs: Record<string, string> = {};
  for (const v of allUserVerifications ?? []) {
    if (v.national_id_url && !existingDocs.national_id) existingDocs.national_id = v.national_id_url;
    if (v.selfie_url && !existingDocs.selfie) existingDocs.selfie = v.selfie_url;
    if (v.business_reg_url && !existingDocs.business_reg) existingDocs.business_reg = v.business_reg_url;
    if (v.driving_permit_url && !existingDocs.driving_permit) existingDocs.driving_permit = v.driving_permit_url;
    if (v.vehicle_reg_url && !existingDocs.vehicle_reg) existingDocs.vehicle_reg = v.vehicle_reg_url;
    if (v.insurance_url && !existingDocs.insurance_cert) existingDocs.insurance_cert = v.insurance_url;
    if (v.vehicle_photo_url && !existingDocs.vehicle_photo) existingDocs.vehicle_photo = v.vehicle_photo_url;
    if (v.qualifications_url && !existingDocs.qualifications) existingDocs.qualifications = v.qualifications_url;
  }

  const rejection = latest?.status === 'rejected' ? latest : null;

  const roleLevels = ((profile as any)?.role_verification_levels ?? {}) as Record<string, VerificationLevel>;
  const currentLevel: VerificationLevel = role === primaryRole
    ? (roleLevels[role] ?? (profile as any)?.verification_level ?? 'grey')
    : (roleLevels[role] ?? 'grey');
  const trustScore   = (profile as any)?.trust_score ?? 50;
  const deals        = (profile as any)?.completed_deals ?? 0;
  const header       = ROLE_HEADER[role] ?? DEFAULT_HEADER;
  const phoneVerified = (profile as any)?.phone_verified ?? false;
  const phoneNumber   = (profile as any)?.phone_number ?? null;

  const isKycDone = currentLevel === 'blue' || currentLevel === 'gold';
  const isEnterpriseDone = currentLevel === 'gold';

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
            Account Trust Status
          </p>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Two-column grid: verification level | trust score */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Left: badge */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Active Badge
              </p>
              <VerificationBadge level={currentLevel} size="md" />
              <p style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                {BADGE_CONFIG[currentLevel].description}
              </p>
            </div>

            {/* Right: trust ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>
                Trust Score
              </p>
              <TrustScore score={trustScore} deals={deals} size="sm" />
            </div>
          </div>

          {/* Clean 3-Stage Trust Milestone Path */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Verification Journey
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Step 1: Phone */}
              <div style={{
                background: phoneVerified ? 'var(--color-primary-bg)' : 'var(--color-surface-2)',
                border: `1.5px solid ${phoneVerified ? 'var(--color-primary-muted)' : C.border}`,
                borderRadius: 12,
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: phoneVerified ? 'var(--color-primary)' : 'var(--color-surface-3)',
                  color: phoneVerified ? '#fff' : C.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px',
                }}>
                  {phoneVerified ? <Check size={14} /> : <Smartphone size={14} />}
                </div>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: phoneVerified ? 'var(--color-primary)' : C.text, margin: 0 }}>
                  1. Phone Confirmed
                </p>
                <p style={{ fontSize: 10.5, color: C.muted, margin: '2px 0 0' }}>
                  {phoneVerified ? 'Verified' : 'Pending'}
                </p>
              </div>

              {/* Step 2: Role KYC */}
              <div style={{
                background: isKycDone ? 'var(--color-sky-bg)' : pending ? '#FEF3C7' : 'var(--color-surface-2)',
                border: `1.5px solid ${isKycDone ? '#BFDBFE' : pending ? '#FDE68A' : C.border}`,
                borderRadius: 12,
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isKycDone ? '#0284C7' : pending ? '#D97706' : 'var(--color-surface-3)',
                  color: isKycDone || pending ? '#fff' : C.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px',
                }}>
                  {isKycDone ? <Check size={14} /> : <Gem size={14} />}
                </div>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: isKycDone ? '#0284C7' : pending ? '#D97706' : C.text, margin: 0 }}>
                  2. Role KYC
                </p>
                <p style={{ fontSize: 10.5, color: C.muted, margin: '2px 0 0' }}>
                  {isKycDone ? 'Verified' : pending ? 'In Review' : 'Next Step'}
                </p>
              </div>

              {/* Step 3: Enterprise */}
              <div style={{
                background: isEnterpriseDone ? '#FEF3C7' : 'var(--color-surface-2)',
                border: `1.5px solid ${isEnterpriseDone ? '#FDE68A' : C.border}`,
                borderRadius: 12,
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isEnterpriseDone ? '#D97706' : 'var(--color-surface-3)',
                  color: isEnterpriseDone ? '#fff' : C.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px',
                }}>
                  {isEnterpriseDone ? <Check size={14} /> : <Star size={14} />}
                </div>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: isEnterpriseDone ? '#D97706' : C.text, margin: 0 }}>
                  3. Enterprise
                </p>
                <p style={{ fontSize: 10.5, color: C.muted, margin: '2px 0 0' }}>
                  {isEnterpriseDone ? 'Certified' : 'For Fleets & Coops'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone step */}
      {!phoneVerified && <PhoneVerifyStep initialPhone={phoneNumber} />}

      {/* Unified Role KYC Document Verification Wizard */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '24px' }}>
        {currentLevel === 'gold' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#D97706', marginBottom: 12 }}>
              <Star size={44} />
            </div>
            <p style={{ color: C.text, fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>Enterprise Verified</p>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>You hold the highest verified trust level on Cropify.</p>
          </div>
        ) : (
          <VerifyWizard
            userId={user.id}
            profileId={(profile as any)?.id ?? ''}
            role={role}
            currentLevel={currentLevel}
            hasPending={!!pending}
            existingDocs={existingDocs}
            rejection={rejection ? { level: rejection.level, reason: rejection.rejection_reason ?? null } : null}
          />
        )}
      </div>
    </div>
  );
}

