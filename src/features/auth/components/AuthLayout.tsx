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
      style={{ background: 'linear-gradient(160deg, #FFF7ED 0%, #FFEDD5 50%, #FED7AA 100%)' }}
    >
      {/* Card */}
      <div
        className="w-full max-w-[420px]"
        style={{
          background: '#FFFFFF',
          border: '2px solid #FED7AA',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(249,115,22,0.18)',
        }}
      >
        {/* Header */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ borderBottom: '1.5px solid #FEE2C8' }}
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-black"
              style={{ background: '#F97316', color: '#fff' }}
            >
              K
            </span>
            <span className="text-xl font-black" style={{ color: '#EA580C', letterSpacing: '-0.03em' }}>
              Kulima
            </span>
          </Link>

          <h1
            className="text-2xl leading-tight"
            style={{ color: '#000000', letterSpacing: '-0.025em', fontWeight: 900 }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm" style={{ color: '#374151', fontWeight: 700 }}>
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
              borderTop: '1.5px solid #FEE2C8',
              color: '#374151',
              fontWeight: 700,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
