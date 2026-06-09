import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAF9',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #1B4332, #40916C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 24, boxShadow: '0 8px 32px rgba(27,67,50,0.25)',
        }}
      >
        🌱
      </div>

      <p
        style={{
          fontSize: 96, fontWeight: 900, letterSpacing: '-0.05em',
          color: '#1B4332', lineHeight: 1, marginBottom: 8,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        404
      </p>

      <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
        Page not found
      </p>

      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
        The page you're looking for doesn't exist or has been moved.
        Let's get you back to the farm.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/dashboard"
          style={{
            padding: '12px 24px', background: '#1B4332', color: '#fff',
            borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(27,67,50,0.3)',
          }}
        >
          Go to Dashboard →
        </Link>
        <Link
          href="/farmer/marketplace"
          style={{
            padding: '12px 24px', background: '#fff', color: '#1B4332',
            borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
            border: '1.5px solid #E5E7EB',
          }}
        >
          Browse Marketplace
        </Link>
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 48, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { href: '/farmer/dashboard', label: 'Farmer Hub' },
          { href: '/buyer/dashboard',  label: 'Buyer Hub' },
          { href: '/farmer/prices',    label: 'Live Prices' },
          { href: '/farmer/weather',   label: 'Weather' },
        ].map(({ href, label }) => (
          <Link key={href} href={href} style={{ fontSize: 12, color: '#40916C', fontWeight: 600, textDecoration: 'none' }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
