import React from 'react';

export interface AppIconProps {
  size?: number;
  rounded?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  alt?: string;
}

/**
 * The official Cropify App Icon mark — segmented circular emblem featuring
 * Ugandan agriculture, technology, market and growth motifs with the central sprout.
 */
export function AppIcon({
  size = 28,
  rounded = 0,
  className = '',
  style = {},
  priority = false,
  alt = 'Cropify',
}: AppIconProps) {
  const iconSrc =
    size > 256
      ? '/icons/icon-512.png?v=12'
      : size > 64
      ? '/icons/icon-192.png?v=12'
      : '/icons/icon-96.png?v=12';

  return (
    <img
      src={iconSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        flexShrink: 0,
        display: 'block',
        objectFit: 'contain',
        ...style,
      }}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
