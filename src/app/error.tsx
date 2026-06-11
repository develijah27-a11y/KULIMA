'use client';

export default function GlobalError({ reset }: { error?: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 48 }}>🌿</p>
        <h1 style={{ fontWeight: 800, fontSize: 22, margin: '12px 0 6px', color: 'var(--d-text)' }}>Something went wrong</h1>
        <p style={{ fontSize: 14, opacity: 0.6, marginBottom: 20, color: 'var(--d-text)' }}>Please try again or go back to the dashboard.</p>
        <button
          onClick={reset}
          style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
