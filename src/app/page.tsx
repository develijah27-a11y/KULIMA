import Link from 'next/link';
import { CloudRain, TrendingUp, Users, Microscope, Package, BarChart3, Globe, Leaf, ShoppingCart, Store, Check } from 'lucide-react';

const glow = (color: string, top: string, left: string, size: number) => ({
  position: 'absolute' as const,
  top, left,
  width: size, height: size,
  borderRadius: '50%',
  background: color,
  filter: 'blur(110px)',
  pointerEvents: 'none' as const,
});

const glass = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.10)',
};

export default function Home() {
  return (
    <div style={{ background: 'var(--color-soil)', color: 'var(--color-text-on-dark)', minHeight: '100vh', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow blobs */}
      <div style={glow('rgba(34,197,94,0.28)', '-10%', '-8%', 480)} />
      <div style={glow('rgba(14,165,233,0.18)', '10%', '70%', 420)} />
      <div style={glow('rgba(217,119,6,0.14)', '55%', '5%', 380)} />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, ...glass, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-primary)', color: '#06210F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15 }}>A</div>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>AgriNova</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/auth/signin" style={{ padding: '9px 20px', borderRadius: 10, ...glass, color: 'var(--color-text-on-dark)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Sign in</Link>
            <Link href="/auth/signup" style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--color-primary)', color: '#06210F', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 18px rgba(34,197,94,0.35)' }}>Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 72px', textAlign: 'center', position: 'relative' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 99, ...glass, color: 'var(--color-primary-dark)', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 28 }}>
          <Globe size={13} /> Smart Farming
        </div>

        <h1 style={{ fontSize: 'clamp(3rem,9vw,5.5rem)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.95, marginBottom: 24 }}>
          Grow smarter.<br />
          <span style={{ color: 'var(--color-primary)' }}>Sell better.</span>
        </h1>

        <p style={{ fontSize: 18, color: 'rgba(240,253,244,0.65)', fontWeight: 600, marginBottom: 36, maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.5 }}>
          Weather, prices, buyers, disease detection — one app.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          <Link href="/auth/signup" style={{ padding: '16px 36px', borderRadius: 14, background: 'var(--color-primary)', color: '#06210F', fontWeight: 800, fontSize: 17, textDecoration: 'none', boxShadow: '0 8px 28px rgba(34,197,94,0.40)', letterSpacing: '-0.01em' }}>
            Create free account
          </Link>
          <Link href="/auth/signin" style={{ padding: '16px 36px', borderRadius: 14, ...glass, color: 'var(--color-text-on-dark)', fontWeight: 800, fontSize: 17, textDecoration: 'none' }}>
            Sign in →
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { value: '10,000+', label: 'Farmers',   color: 'var(--color-primary)' },
            { value: '50+',     label: 'Markets',   color: 'var(--color-harvest)' },
            { value: '30+',     label: 'Districts', color: 'var(--color-sky)' },
          ].map(({ value, label, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: '-0.04em', margin: 0 }}>{value}</p>
              <p style={{ fontSize: 12, color: 'rgba(240,253,244,0.45)', fontWeight: 700, marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — glass band */}
      <section style={{ position: 'relative', padding: '48px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { icon: <CloudRain size={20} />, title: 'Weather' },
              { icon: <TrendingUp size={20} />, title: 'Crop Prices' },
              { icon: <Users size={20} />, title: 'Marketplace' },
              { icon: <Microscope size={20} />, title: 'Crop Doctor' },
              { icon: <Package size={20} />, title: 'Farm Inputs' },
              { icon: <BarChart3 size={20} />, title: 'Analytics' },
            ].map(({ icon, title }) => (
              <div key={title} style={{ padding: '16px 18px', borderRadius: 14, ...glass, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', color: 'var(--color-primary)' }}>{icon}</span>
                <p style={{ fontWeight: 700, fontSize: 13.5, margin: 0 }}>{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section style={{ position: 'relative', padding: '56px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 900, textAlign: 'center', letterSpacing: '-0.04em', marginBottom: 36 }}>
            One platform. Every role.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { icon: <Leaf size={28} />, role: 'Farmers',   accent: 'var(--color-primary)', points: ['Weather & prices', 'Buyer offers', 'AI disease scan'] },
              { icon: <ShoppingCart size={28} />, role: 'Buyers', accent: 'var(--color-harvest)', points: ['Verified listings', 'Direct offers', 'Escrow payments'] },
              { icon: <Store size={28} />, role: 'Suppliers', accent: 'var(--color-sky)', points: ['Reach farmers', 'Manage orders', 'Verified profile'] },
            ].map(({ icon, role, accent, points }) => (
              <div key={role} style={{ padding: '24px', borderRadius: 18, ...glass }}>
                <span style={{ display: 'flex', marginBottom: 12, color: accent }}>{icon}</span>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: accent, letterSpacing: '-0.02em', margin: '0 0 14px' }}>{role}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {points.map(p => (
                    <li key={p} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(240,253,244,0.75)', fontWeight: 600 }}>
                      <span style={{ color: accent, display: 'flex', flexShrink: 0 }}><Check size={12} /></span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 28 }}>
          Ready to grow <span style={{ color: 'var(--color-primary)' }}>smarter?</span>
        </h2>
        <Link href="/auth/signup" style={{ display: 'inline-block', padding: '16px 44px', borderRadius: 14, background: 'var(--color-primary)', color: '#06210F', fontWeight: 900, fontSize: 18, textDecoration: 'none', boxShadow: '0 8px 32px rgba(34,197,94,0.45)', letterSpacing: '-0.02em' }}>
          Get started free →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--color-primary)', color: '#06210F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>A</div>
          <span style={{ color: 'rgba(240,253,244,0.4)', fontSize: 12 }}>© 2026 AgriNova</span>
        </div>
      </footer>

    </div>
  );
}
