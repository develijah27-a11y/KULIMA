'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#0D160A', color: '#F7F2E8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 48 }}>🌿</p>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, margin: '12px 0 6px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, opacity: .6, marginBottom: 20 }}>Please try again or go back to the dashboard.</p>
          <button
            onClick={reset}
            style={{ background: '#7DB55A', color: '#0D160A', border: 'none', padding: '10px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
