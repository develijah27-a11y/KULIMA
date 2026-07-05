import { getTrustColor, getTrustLabel } from '@/lib/trust';

interface Props {
  score: number;
  deals?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function TrustScore({ score, deals = 0, size = 'md' }: Props) {
  const color = getTrustColor(score);
  const label = getTrustLabel(score);

  const r      = size === 'sm' ? 24 : size === 'md' ? 32 : 40;
  const stroke = 5;
  const circ   = 2 * Math.PI * r;
  const filled = (Math.min(score, 100) / 100) * circ;
  const dim    = (r + stroke) * 2;

  const numSize  = size === 'sm' ? 13 : size === 'md' ? 16 : 20;
  const lblSize  = size === 'sm' ? 11 : size === 'md' ? 12 : 14;
  const dealSize = size === 'sm' ? 10 : 11;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: dim, height: dim, flexShrink: 0 }}>
        <svg
          width={dim}
          height={dim}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none"
            stroke="var(--color-border-mid)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
          />
        </svg>
        {/* Score number centred in ring */}
        <span
          aria-label={`Trust score: ${score}`}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: numSize, fontWeight: 800, color,
            fontFamily: 'var(--font-body)',
            letterSpacing: '-0.02em',
          }}
        >
          {score}
        </span>
      </div>

      {/* Label + deals */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: lblSize, fontWeight: 700, color,
          margin: 0, lineHeight: 1.2,
          fontFamily: 'var(--font-body)',
        }}>
          {label}
        </p>
        {deals > 0 && (
          <p style={{
            fontSize: dealSize, color: 'var(--d-muted)',
            margin: '2px 0 0', lineHeight: 1.2,
          }}>
            {deals} deal{deals !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
