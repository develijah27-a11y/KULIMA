'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WifiOff, RotateCcw, Home } from 'lucide-react';

export default function OfflinePage() {
  const router = useRouter();

  useEffect(() => {
    // If browser is already online, return to where the user was or dashboard immediately
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        router.replace('/dashboard');
      }
    }

    const onOnline = () => {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        router.replace('/dashboard');
      }
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg, #F8FAFC)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'var(--color-surface-2, #EAF6EE)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          boxShadow: '0 4px 16px rgba(22, 107, 58, 0.08)',
        }}
      >
        <WifiOff size={34} style={{ color: 'var(--color-primary, #166B3A)' }} />
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--color-text, #111827)',
          marginBottom: 8,
          fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
        }}
      >
        You're offline
      </h1>

      <p
        style={{
          fontSize: 14,
          color: 'var(--color-text-muted, #6B7280)',
          marginBottom: 28,
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        This page hasn't been saved for offline use yet. Once you're connected to the internet, you'll be returned automatically.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              if (window.history.length > 1) window.history.back();
              else window.location.reload();
            }
          }}
          style={{
            padding: '12px 24px',
            background: 'var(--color-primary, #166B3A)',
            color: '#fff',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(22,107,58,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RotateCcw size={16} /> Try again
        </button>

        <Link
          href="/dashboard"
          style={{
            padding: '12px 20px',
            background: 'var(--color-surface, #FFFFFF)',
            color: 'var(--color-text, #111827)',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            border: '1px solid var(--color-border, #E5E7EB)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <Home size={16} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
