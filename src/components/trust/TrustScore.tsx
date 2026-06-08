import { getTrustColor, getTrustLabel } from '@/lib/trust';

interface Props {
  score: number;
  deals?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function TrustScore({ score, deals = 0, size = 'md' }: Props) {
  const color = getTrustColor(score);
  const label = getTrustLabel(score);
  const r = size === 'sm' ? 22 : size === 'md' ? 30 : 38;
  const stroke = size === 'sm' ? 4 : 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const dim = (r + stroke) * 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 8 : 12 }}>
      <div style={{ position: 'relative', width: dim, height: dim, flexShrink: 0 }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none" stroke="#F3F4F6" strokeWidth={stroke}
          />
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
          />
        </svg>
        <span style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size === 'sm' ? 11 : size === 'md' ? 13 : 16,
          fontWeight: 800, color,
        }}>
          {score}
        </span>
      </div>
      <div>
        <p style={{ fontSize: size === 'sm' ? 12 : 14, fontWeight: 700, color, margin: 0 }}>{label}</p>
        {deals > 0 && (
          <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{deals} completed deal{deals !== 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  );
}
