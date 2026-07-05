import { Smartphone, Check, Gem, Star, CircleDashed } from 'lucide-react';
import { BADGE_CONFIG, type VerificationLevel } from '@/lib/trust';

interface Props {
  level: VerificationLevel;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

export function VerificationBadge({ level, size = 'sm', showLabel = true }: Props) {
  const cfg = BADGE_CONFIG[level];

  const iconSize = size === 'xs' ? 9 : size === 'sm' ? 11 : 13;
  const iconEl = level === 'none'  ? <CircleDashed size={iconSize} />
               : level === 'grey'  ? <Smartphone size={iconSize} />
               : level === 'blue'  ? <Gem size={iconSize} />
               : level === 'gold'  ? <Star size={iconSize} />
               : <Check size={iconSize} />;

  const px = size === 'xs' ? '6px 8px' : size === 'sm' ? '4px 10px' : '6px 14px';
  const fs = size === 'xs' ? '10px' : size === 'sm' ? '11px' : '13px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: px,
        borderRadius: '999px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: fs,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {iconEl}
      {showLabel && cfg.label}
    </span>
  );
}
