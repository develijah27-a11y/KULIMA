/**
 * Optimized Image Component
 * Wrapper around Next.js Image with smart defaults for performance
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  fallback?: string;
}

/**
 * OptimizedImage component with:
 * - Automatic blur placeholder
 * - Lazy loading by default
 * - Error fallback
 * - AVIF/WebP format support
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  sizes,
  objectFit = 'cover',
  fallback = '/icons/icon.svg?v=2',
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setImgSrc(fallback);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const imageProps = fill
    ? {
        fill: true,
        sizes: sizes || '100vw',
      }
    : {
        width: width || 400,
        height: height || 300,
      };

  return (
    <div className={`relative ${className}`} style={{ overflow: 'hidden' }}>
      {isLoading && (
        <div 
          className="skeleton absolute inset-0" 
          aria-label="Loading image"
        />
      )}
      <Image
        {...imageProps}
        src={imgSrc}
        alt={alt}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ objectFit }}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={85}
      />
    </div>
  );
}

/**
 * Avatar component optimized for profile images
 */
export function Avatar({
  src,
  alt,
  size = 40,
  fallback = '👤',
}: {
  src?: string;
  alt: string;
  size?: number;
  fallback?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: 'var(--color-primary-bg)',
          color: 'var(--color-primary)',
          fontSize: size * 0.5,
        }}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div className="relative rounded-full overflow-hidden" style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="rounded-full"
        onError={() => setError(true)}
        quality={75}
      />
    </div>
  );
}
