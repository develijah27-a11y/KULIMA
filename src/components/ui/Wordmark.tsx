import React from 'react';

export function Wordmark({
  color = '#0A3F23',
  leafColor = '#34A853',
  variant = 'lowercase',
  style,
}: {
  color?: string;
  leafColor?: string;
  variant?: 'lowercase' | 'uppercase';
  style?: React.CSSProperties;
}) {
  if (variant === 'uppercase') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          fontFamily: 'var(--font-poppins), system-ui, sans-serif',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color,
          ...style,
        }}
      >
        CROP
        <span style={{ position: 'relative', display: 'inline-block', width: '0.32em' }}>
          <span
            style={{
              position: 'absolute',
              left: '0.09em',
              bottom: 0,
              width: '0.14em',
              height: '0.56em',
              borderRadius: '0.07em',
              background: color,
            }}
          />
          <svg
            viewBox="0 0 24 24"
            style={{ position: 'absolute', left: '-0.02em', bottom: '0.62em', width: '0.4em', height: '0.4em' }}
            aria-hidden="true"
          >
            <path d="M4,21 Q5,6 21,3 Q17,16 4,21 Z" fill={leafColor} />
          </svg>
        </span>
        FY
      </span>
    );
  }

  // Default matching lowercase "cropify" from official brand asset
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: 'var(--font-poppins), system-ui, sans-serif',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color,
        ...style,
      }}
    >
      <span>crop</span>
      <span style={{ position: 'relative', display: 'inline-block', width: '0.28em', color: leafColor }}>
        {/* 'i' stem */}
        <span
          style={{
            position: 'absolute',
            left: '0.06em',
            bottom: 0,
            width: '0.15em',
            height: '0.68em',
            borderRadius: '0.07em',
            background: leafColor,
          }}
        />
        {/* leaf dot */}
        <svg
          viewBox="0 0 24 24"
          style={{
            position: 'absolute',
            left: '-0.05em',
            bottom: '0.74em',
            width: '0.38em',
            height: '0.38em',
            transform: 'rotate(-10deg)',
          }}
          aria-hidden="true"
        >
          <path d="M3,21 C4,10 13,3 21,3 C21,11 14,20 3,21 Z" fill={leafColor} />
        </svg>
      </span>
      <span style={{ color: leafColor }}>fy</span>
    </span>
  );
}
