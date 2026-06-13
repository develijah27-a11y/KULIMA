'use client';

import { useEffect } from 'react';

export default function SupplierError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Supplier] Page error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        padding: '40px 24px',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <p style={{ fontSize: 40 }}>⚠️</p>
      <p
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--d-text)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Something went wrong
      </p>
      <p style={{ fontSize: 13, color: 'var(--d-muted)', maxWidth: 340 }}>
        {error.message || 'An unexpected error occurred loading this page.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          background: 'var(--color-primary-hover)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
