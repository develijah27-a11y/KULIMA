'use client';

import React from 'react';
import Link from 'next/link';

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

      {/* Card */}
      <div
        className="w-full max-w-[420px]"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.30)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-black"
              style={{ background: 'var(--color-primary)', color: '#06210F' }}
            >
              A
            </span>
            <span className="text-xl font-black" style={{ color: 'var(--color-text-on-dark)', letterSpacing: '-0.03em' }}>
              AgriNova
            </span>
          </Link>

          <h1
            className="text-2xl leading-tight"
            style={{ color: 'var(--color-text-on-dark)', letterSpacing: '-0.025em', fontWeight: 900 }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm" style={{ color: 'rgba(240,253,244,0.55)', fontWeight: 600 }}>
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
              color: 'rgba(240,253,244,0.55)',
              fontWeight: 600,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
