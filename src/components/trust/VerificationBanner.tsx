import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { type VerificationLevel } from '@/lib/trust';

interface Props {
  level: VerificationLevel;
  verifyHref: string;
  /** Extra context on what's needed, e.g. "national ID, driving permit, and a photo" */
  requiredDocsLabel?: string;
}

// Shown until a user has at least their ID verified ('green'). Below that,
// they can't be trusted for escrow deals, payouts, or sensitive transactions.
export function VerificationBanner({ level, verifyHref, requiredDocsLabel }: Props) {
  if (level === 'green' || level === 'blue' || level === 'gold') return null;

  const isNone = level === 'none';

  return (
    <Link
      href={verifyHref}
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'var(--color-warning-bg)',
        border: '1px solid var(--color-warning-border)',
        textDecoration: 'none',
      }}
    >
      <span style={{ color: 'var(--color-warning)', flexShrink: 0, display: 'flex' }}>
        <ShieldAlert size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: 'var(--d-text)' }}>
          {isNone ? 'Verify your account to get started' : 'Finish verifying your account'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--d-muted)' }}>
          {requiredDocsLabel
            ? `Submit your ${requiredDocsLabel} — required before you can accept paid jobs.`
            : 'Complete verification to unlock jobs, payouts, and escrow-protected deals.'}
        </p>
      </div>
      <ArrowRight size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
    </Link>
  );
}
