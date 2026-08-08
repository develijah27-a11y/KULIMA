'use client';

import React from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/AppIcon';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  mode?: 'signin' | 'signup';
}

export function AuthLayout({ children, title, subtitle, footer }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'var(--color-soil)', position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-10%', left: '-8%', width: 420, height: 420, borderRadius: '50%', background: 'rgba(34,197,94,0.26)', filter: 'blur(110px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-8%', width: 380, height: 380, borderRadius: '50%', background: 'rgba(14,165,233,0.16)', filter: 'blur(110px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', right: '10%', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,167,38,0.10)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      {/* Card — layered glass: outer soft shadow, inner top sheen, saturated blur */}
      <div
        className="w-full max-w-[420px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 22,
          boxShadow: '0 24px 70px rgba(0,0,0,0.38), 0 2px 0 rgba(255,255,255,0.12) inset, 0 -1px 0 rgba(0,0,0,0.20) inset',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top sheen line — reads as a light catching a glass edge */}
        <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }} />

        {/* Header */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <AppIcon size={32} rounded={9} />
            <span className="text-xl font-black" style={{ color: 'var(--color-text-on-dark)', letterSpacing: '-0.03em' }}>
              Cropify
            </span>
          </Link>

          <h1
            className="text-2xl leading-tight"
            style={{ color: 'var(--color-text-on-dark)', letterSpacing: '-0.025em', fontWeight: 900 }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm" style={{ color: 'rgba(240,253,244,0.80)', fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Form area */}
        <div className="px-8 py-6">
          {children}
        </div>

        {/* Footer link */}
        {footer && (
          <div
            className="px-8 py-4 text-center text-sm"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(240,253,244,0.75)',
              fontWeight: 500,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
