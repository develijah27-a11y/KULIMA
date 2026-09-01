import { createClient } from '@/lib/supabase/server';
import { BADGE_CONFIG, type VerificationLevel } from '@/lib/trust';
import { CheckCircle2, Clock, XCircle, Mail, Phone, ShieldCheck, ArrowRight } from 'lucide-react';

interface Props {
  /** Which role dashboard is requesting this card (to build the correct verify link) */
  role: 'farmer' | 'buyer' | 'supplier' | 'transporter' | 'pathologist' | 'offtaker';
}

export async function VerificationStatusCard({ role }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch profile verification data
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles, verification_level, role_verification_levels, phone_number, phone_verified')
    .eq('user_id', user.id)
    .single();

  const userRole = (profile as any)?.role ?? '';
  const userRoles: string[] = (profile as any)?.roles ?? [];
  const isAdmin = userRole === 'admin' || userRoles.includes('admin');

  const C = {
    text: 'var(--d-text)',
    muted: 'var(--d-muted)',
    border: 'var(--d-border)',
    card: 'var(--d-card)',
    shadow: 'var(--d-shadow-card)',
  };

  if (isAdmin) {
    return (
      <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-sky-bg) 100%)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', margin: 0 }}>
              Account Verification
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: '2px 0 0' }}>
              Administrator (KYC Exempt)
            </p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 800, background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0',
          }}>
            <ShieldCheck size={14} /> Full Access
          </span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            This account is registered as a Cropify System Administrator and has unrestricted platform permissions across all modules.
          </p>
        </div>
      </div>
    );
  }

  // Email confirmed from auth metadata
  const emailConfirmed = !!user.email_confirmed_at;

  const roleVerification = (profile as any)?.role_verification_levels?.[role];
  const fallbackLevel = (profile as any)?.verification_level ?? 'none';
  const kycLevel = (roleVerification ?? fallbackLevel) as VerificationLevel;

  const phoneNumber = (profile as any)?.phone_number;
  const phoneVerified = (profile as any)?.phone_verified ?? false;

  const badge = BADGE_CONFIG[kycLevel] ?? BADGE_CONFIG.none;
  const verifyHref = `/${role}/verify`;

  const items = [
    {
      label: 'Email Address',
      value: user.email ?? '—',
      verified: emailConfirmed,
      icon: <Mail size={16} />,
      verifiedLabel: 'Verified',
      unverifiedLabel: 'Not confirmed',
      unverifiedAction: '/auth/signup', // resend flow handled on auth page
      actionLabel: 'Resend',
    },
    {
      label: 'Phone Number',
      value: phoneNumber ?? 'Not added',
      verified: phoneVerified,
      icon: <Phone size={16} />,
      verifiedLabel: 'Verified',
      unverifiedLabel: phoneNumber ? 'Not verified' : 'Not added',
      unverifiedAction: verifyHref,
      actionLabel: 'Verify',
    },
    {
      label: 'Identity (KYC)',
      value: badge.label,
      verified: kycLevel !== 'none',
      partial: kycLevel === 'grey',
      icon: <ShieldCheck size={16} />,
      verifiedLabel: badge.label,
      unverifiedLabel: 'Not verified',
      unverifiedAction: verifyHref,
      actionLabel: 'Verify',
    },
  ];

  return (
    <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
            Verification Status
          </p>
          <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
            Email, phone, and identity verification
          </p>
        </div>
        {/* KYC badge pill */}
        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 99, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap' }}>
          {badge.label}
        </span>
      </div>

      {/* Status rows */}
      <div>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const color = item.verified
            ? 'var(--color-success)'
            : item.partial
              ? 'var(--color-harvest)'
              : 'var(--color-danger)';
          const bg = item.verified
            ? 'var(--color-success-bg)'
            : item.partial
              ? 'var(--color-harvest-bg)'
              : 'var(--color-danger-bg)';
          const StatusIcon = item.verified
            ? CheckCircle2
            : item.partial
              ? Clock
              : XCircle;

          return (
            <div
              key={item.label}
              style={{
                padding: '14px 20px',
                borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {/* Channel icon */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: bg,
                color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>

              {/* Label + value */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.value}
                </p>
              </div>

              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: bg,
                  color,
                }}>
                  <StatusIcon size={11} />
                  {item.verified ? item.verifiedLabel : item.unverifiedLabel}
                </span>
                {!item.verified && (
                  <a
                    href={item.unverifiedAction}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11.5,
                      fontWeight: 800,
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: 'var(--color-primary)',
                      color: '#fff',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.actionLabel} <ArrowRight size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — only shown when not fully KYC verified */}
      {kycLevel === 'none' || kycLevel === 'grey' ? (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, margin: 0 }}>
            Get fully verified to unlock all platform features and higher trust.
          </p>
          <a href={verifyHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, padding: '7px 14px', borderRadius: 9, background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Get Verified <ArrowRight size={12} />
          </a>
        </div>
      ) : null}
    </div>
  );
}
