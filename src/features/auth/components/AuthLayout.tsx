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
      style={{ background: 'var(--color-soil)' }}
    >
      {/* Card */}
      <div
        className="w-full max-w-[420px]"
        style={{
          background: '#132416',
          border: '1px solid rgba(74,222,128,0.12)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.50)',
        }}
      >
        {/* Header strip */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6"
          >
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: 'var(--color-sprout)' }}
            >
              Kulima
            </span>
          </Link>

          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: 'var(--color-cream)', letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm" style={{ color: 'rgba(249,250,251,0.5)' }}>
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
              borderTop: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(249,250,251,0.45)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
