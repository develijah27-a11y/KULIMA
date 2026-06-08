import { BADGE_CONFIG, type VerificationLevel } from '@/lib/trust';

interface Props {
  level: VerificationLevel;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

export function VerificationBadge({ level, size = 'sm', showLabel = true }: Props) {
  const cfg = BADGE_CONFIG[level];

  const icons: Record<VerificationLevel, string> = {
    grey:  '📱',
    green: '✓',
    blue:  '◆',
    gold:  '★',
  };

  const px = size === 'xs' ? '6px 8px' : size === 'sm' ? '4px 10px' : '6px 14px';
  const fs = size === 'xs' ? '10px' : size === 'sm' ? '11px' : '13px';
  const iconFs = size === 'xs' ? '9px' : size === 'sm' ? '11px' : '13px';

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
      <span style={{ fontSize: iconFs }}>{icons[level]}</span>
      {showLabel && cfg.label}
    </span>
  );
}
