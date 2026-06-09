'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getCropPhotoUrl, getCropGradient } from '@/lib/crop-photos';

interface CropPhotoProps {
  crop: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  showEmoji?: boolean;
}

export function CropPhoto({ crop, width = 600, height = 400, className = '', style = {}, showEmoji = false }: CropPhotoProps) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getCropPhotoUrl(crop, width, height);
  const gradient = getCropGradient(crop);

  if (!photoUrl || imgError) {
    // Beautiful gradient fallback
    return (
      <div
        className={className}
        style={{
          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        {/* Decorative blur circles */}
        <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '60%', height: '60%', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(16px)' }} />
        <span style={{ fontSize: Math.min(width, height) * 0.28, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))', position: 'relative', zIndex: 1 }}>
          {gradient.emoji}
        </span>
        {showEmoji && (
          <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {crop}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <Image
        src={photoUrl}
        alt={crop}
        fill
        className="object-cover"
        onError={() => setImgError(true)}
        sizes={`${width}px`}
      />
      {showEmoji && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
      )}
    </div>
  );
}

// Card variant — fixed aspect ratio card with crop photo
export function CropPhotoCard({
  crop, label, sub, href, price, badge,
}: {
  crop: string; label: string; sub?: string; href?: string;
  price?: string; badge?: { text: string; color: string; bg: string };
}) {
  const gradient = getCropGradient(crop);
  const photoUrl = getCropPhotoUrl(crop, 400, 260);
  const [imgError, setImgError] = useState(false);

  const inner = (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cursor: href ? 'pointer' : 'default' }}>
      {/* Photo or gradient header */}
      <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
        {photoUrl && !imgError ? (
          <>
            <Image src={photoUrl} alt={crop} fill className="object-cover" onError={() => setImgError(true)} sizes="400px" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)' }} />
          </>
        ) : (
          <div style={{ background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 48, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>{gradient.emoji}</span>
          </div>
        )}
        {badge && (
          <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: badge.bg, color: badge.color }}>
            {badge.text}
          </span>
        )}
      </div>
      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px', textTransform: 'capitalize' }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{sub}</p>}
        {price && <p style={{ fontSize: 16, fontWeight: 900, color: '#1B4332', margin: '8px 0 0', letterSpacing: '-0.02em' }}>{price}</p>}
      </div>
    </div>
  );

  if (href) return <a href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>;
  return inner;
}
