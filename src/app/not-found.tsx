import Link from 'next/link';
import { AppIcon } from '@/components/ui/AppIcon';

export default function NotFound() {
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
      {/* Logo mark */}
      <div style={{ marginBottom: 24, filter: 'drop-shadow(0 8px 24px rgba(22,163,74,0.25))' }}>
        <AppIcon size={80} rounded={20} priority />
      </div>

      <p
        style={{
          fontSize: 96, fontWeight: 900, letterSpacing: '-0.05em',
          color: 'var(--color-primary)', lineHeight: 1, marginBottom: 8,
          fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
        }}
      >
        404
      </p>

      <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
        Page not found
      </p>

      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
        The page you're looking for doesn't exist or has been moved.
        Let's get you back to the farm.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/dashboard"
          style={{
            padding: '12px 24px', background: 'var(--color-primary)', color: '#fff',
            borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(27,67,50,0.3)',
          }}
        >
          Go to Dashboard →
        </Link>
        <Link
          href="/farmer/marketplace"
          style={{
            padding: '12px 24px', background: '#fff', color: 'var(--color-primary)',
            borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
            border: '1.5px solid var(--color-border-mid)',
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
          <Link key={href} href={href} style={{ fontSize: 12, color: 'var(--color-primary-hover)', fontWeight: 600, textDecoration: 'none' }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
