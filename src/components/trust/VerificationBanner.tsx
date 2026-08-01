import Link from 'next/link';
import { ShieldAlert, TrendingUp, ArrowRight } from 'lucide-react';
import { type VerificationLevel, getLevelDetails, NEXT_LEVEL } from '@/lib/trust';

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

// Below 'green' this is a hard nudge to get minimally verified at all (a
// compliance-adjacent prompt, framed as an opportunity). From 'green' up to
// 'blue'/'gold' it becomes a softer "here's what you're leaving on the
// table" upgrade prompt using the same per-role benefit copy from
// getLevelDetails — previously this banner just vanished once verified at
// all, so a green-tier user never learned blue/gold existed or why it'd be
// worth the extra documents. Only hides once at the true max tier (gold).
export function VerificationBanner({ level, verifyHref, headline, benefit, requiredDocsLabel }: Props) {
  const nextLevel = NEXT_LEVEL[level];
  if (!nextLevel) return null;

  const isUpgrade = level === 'green' || level === 'blue';
  const role = verifyHref.split('/').filter(Boolean)[0] ?? '';

  let shownHeadline = headline;
  let shownBenefit = benefit;
  let shownDocs = requiredDocsLabel;

  if (isUpgrade) {
    const next = getLevelDetails(nextLevel, role);
    shownHeadline = `Upgrade to ${next.title}`;
    shownBenefit = next.benefits.slice(0, 2).join(' · ');
    shownDocs = undefined; // the upgrade line leads with payoff, not paperwork — docs are on the verify page itself
  }

  return (
    <Link
      href={verifyHref}
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: isUpgrade
          ? 'linear-gradient(135deg, var(--color-harvest-bg) 0%, var(--color-primary-bg) 100%)'
          : 'linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-sky-bg) 100%)',
        border: `1px solid ${isUpgrade ? 'var(--color-harvest)' : 'var(--color-primary-muted)'}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ color: isUpgrade ? 'var(--color-harvest)' : 'var(--color-primary)', flexShrink: 0, display: 'flex' }}>
        {isUpgrade ? <TrendingUp size={22} /> : <ShieldAlert size={22} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: 'var(--d-text)' }}>
          {shownHeadline}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--d-muted)' }}>
          {shownBenefit}{shownDocs ? ` — just your ${shownDocs}.` : ''}
        </p>
      </div>
      <ArrowRight size={18} style={{ color: isUpgrade ? 'var(--color-harvest)' : 'var(--color-primary)', flexShrink: 0 }} />
    </Link>
  );
}
