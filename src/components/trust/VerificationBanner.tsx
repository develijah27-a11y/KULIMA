import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { type VerificationLevel } from '@/lib/trust';

interface Props {
  level: VerificationLevel;
  verifyHref: string;
  /** Short, role-specific hook, e.g. "Get verified — start earning today" */
  headline: string;
  /** The payoff for verifying, e.g. "Unlock paid delivery jobs and protected fare payouts" */
  benefit: string;
  /** Extra context on what's needed, e.g. "national ID, driving permit, and a photo" */
  requiredDocsLabel?: string;
}

// Shown until a user has at least their ID verified ('green'). Below that,
// they can't be trusted for escrow deals, payouts, or sensitive transactions.
// Framed as an opportunity to unlock a role-specific benefit rather than a
// compliance warning — this is the main lever for getting people to actually
// finish verifying instead of dismissing it as red tape.
export function VerificationBanner({ level, verifyHref, headline, benefit, requiredDocsLabel }: Props) {
  if (level === 'green' || level === 'blue' || level === 'gold') return null;

  return (
    <Link
      href={verifyHref}
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-sky-bg) 100%)',
        border: '1px solid var(--color-primary-muted)',
        textDecoration: 'none',
      }}
    >
      <span style={{ color: 'var(--color-primary)', flexShrink: 0, display: 'flex' }}>
        <ShieldAlert size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: 'var(--d-text)' }}>
          {headline}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--d-muted)' }}>
          {benefit}{requiredDocsLabel ? ` — just your ${requiredDocsLabel}.` : ''}
        </p>
      </div>
      <ArrowRight size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
    </Link>
  );
}
