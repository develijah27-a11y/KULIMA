'use client';

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: 20, background: 'var(--color-surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <WifiOff size={34} style={{ color: 'var(--color-text-muted)' }} />
      </div>

      <p
        style={{
          fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8,
          fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
        }}
      >
        You're offline
      </p>

      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 32, maxWidth: 340, lineHeight: 1.6 }}>
        This page hasn't been saved for offline use yet. Pages and data you've
        already opened while connected will still work — reconnect to load
        anything new.
      </p>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 28px', background: 'var(--color-primary)', color: '#fff',
          borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(22,107,58,0.3)',
        }}
      >
        Try again
      </button>
    </div>
  );
}
