import { Smartphone, Check, Gem, Star, ShieldAlert } from 'lucide-react';
import { BADGE_CONFIG, type VerificationLevel } from '@/lib/trust';

interface Props {
  level: VerificationLevel;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

export function VerificationBadge({ level, size = 'sm', showLabel = true }: Props) {
  const cfg = BADGE_CONFIG[level];

  const iconSize = size === 'xs' ? 9 : size === 'sm' ? 11 : 13;
  const iconEl = level === 'none'  ? <ShieldAlert size={iconSize} />
               : level === 'grey'  ? <Smartphone size={iconSize} />
               : level === 'blue'  ? <Gem size={iconSize} />
               : level === 'gold'  ? <Star size={iconSize} />
               : <Check size={iconSize} />;

  const px = size === 'xs' ? '4px 7px' : size === 'sm' ? '5px 10px' : '6px 14px';
  const fs = size === 'xs' ? '10px' : size === 'sm' ? '11px' : '13px';
  const gap = size === 'xs' ? 3 : 5;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        padding: px,
        borderRadius: '999px',
        background: cfg.bg,
        color: cfg.color,
        border: `1.5px solid ${cfg.border}`,
        fontSize: fs,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
        fontFamily: 'var(--font-body)',
        /* Shadow that reinforces readability on low-contrast screens */
        boxShadow: level === 'none'
          ? '0 1px 4px rgba(180, 83, 9, 0.18)'
          : level === 'gold'
          ? '0 1px 4px rgba(217, 119, 6, 0.20)'
          : 'none',
      }}
    >
      {iconEl}
      {showLabel && cfg.label}
    </span>
  );
}
