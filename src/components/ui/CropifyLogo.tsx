import React from 'react';
import { AppIcon } from './AppIcon';
import { Wordmark } from './Wordmark';

export interface CropifyLogoProps {
  size?: number;
  variant?: 'full' | 'horizontal' | 'icon';
  color?: string;
  taglineColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CropifyLogo({
  size = 36,
  variant = 'horizontal',
  color = '#0A5C36',
  taglineColor = '#475569',
  className = '',
  style = {},
}: CropifyLogoProps) {
  if (variant === 'icon') {
    return <AppIcon size={size} className={className} style={style} />;
  }

  if (variant === 'full') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center text-center ${className}`}
        style={style}
      >
        <img
          src="/logo.png?v=12"
          alt="Cropify — Inform • Connect • Grow"
          width={size * 2.8}
          height={size * 3.5}
          style={{ width: size * 2.8, height: 'auto', maxHeight: size * 3.5, objectFit: 'contain' }}
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`}
      style={{ flexShrink: 0, ...style }}
    >
      <AppIcon size={size} rounded={Math.round(size * 0.25)} priority />
      <div className="flex flex-col leading-tight">
        <Wordmark color={color} style={{ fontSize: Math.round(size * 0.58) }} />
        <span
          style={{
            fontSize: Math.max(9, Math.round(size * 0.22)),
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: taglineColor,
            marginTop: -1,
          }}
        >
          Inform • Connect • Grow
        </span>
      </div>
    </div>
  );
}
