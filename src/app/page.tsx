import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ background: '#FFF7ED', color: '#1A0800', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F97316', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>K</div>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#EA580C', letterSpacing: '-0.03em' }}>Kulima</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth/signin" style={{ padding: '9px 22px', borderRadius: 10, border: '2px solid #F97316', color: '#EA580C', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Sign in</Link>
          <Link href="/auth/signup" style={{ padding: '9px 22px', borderRadius: 10, background: '#F97316', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 72px', textAlign: 'center' }}>

        {/* Orange badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 99, background: '#FFEDD5', border: '1.5px solid #FED7AA', color: '#EA580C', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 28 }}>
          🌍 Smart Farming for Africa
        </div>

        {/* Big headline */}
        <h1 style={{ fontSize: 'clamp(3rem,9vw,5.5rem)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.95, marginBottom: 24, color: '#1A0800' }}>
          Grow smarter.<br />
          <span style={{ color: '#F97316' }}>Sell better.</span>
        </h1>

        <p style={{ fontSize: 18, color: '#6B3A1F', fontWeight: 600, marginBottom: 36, maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.5 }}>
          Weather, prices, buyers, and AI disease detection — all in one app.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          <Link href="/auth/signup" style={{ padding: '16px 36px', borderRadius: 14, background: '#F97316', color: '#fff', fontWeight: 800, fontSize: 17, textDecoration: 'none', boxShadow: '0 6px 20px rgba(249,115,22,0.40)', letterSpacing: '-0.01em' }}>
            Create free account
          </Link>
          <Link href="/auth/signin" style={{ padding: '16px 36px', borderRadius: 14, border: '2.5px solid #F97316', color: '#EA580C', fontWeight: 800, fontSize: 17, textDecoration: 'none', background: 'transparent' }}>
            Sign in →
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { value: '10,000+', label: 'Farmers', color: '#F97316' },
            { value: '50+',     label: 'Markets',  color: '#D97706' },
            { value: '30+',     label: 'Districts', color: '#0EA5E9' },
          ].map(({ value, label, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: '-0.04em', margin: 0 }}>{value}</p>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 700, marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — orange band */}
      <section style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', padding: '56px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { icon: '🌦️', title: 'Weather Alerts' },
              { icon: '📈', title: 'Live Crop Prices' },
              { icon: '🤝', title: 'Buyer Marketplace' },
              { icon: '🔬', title: 'AI Crop Doctor' },
              { icon: '📦', title: 'Farm Inputs' },
              { icon: '📊', title: 'Farm Analytics' },
            ].map(({ icon, title }) => (
              <div key={title} style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <p style={{ fontWeight: 800, color: '#fff', fontSize: 14, margin: 0 }}>{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section style={{ background: '#FFFBF5', padding: '64px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 900, textAlign: 'center', letterSpacing: '-0.04em', marginBottom: 36, color: '#1A0800' }}>
            One platform. Every role.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {[
              { emoji: '🌾', role: 'Farmers',   accent: '#F97316', bg: '#FFF7ED', border: '#FED7AA', points: ['Weather & planting guides', 'Live prices & buyer offers', 'AI disease detection'] },
              { emoji: '🛒', role: 'Buyers',    accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A', points: ['Browse verified listings', 'Direct crop offers', 'Escrow payments'] },
              { emoji: '🚚', role: 'Suppliers', accent: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', points: ['Reach farmers directly', 'Manage orders', 'Verified profile'] },
            ].map(({ emoji, role, accent, bg, border, points }) => (
              <div key={role} style={{ padding: '24px', borderRadius: 18, background: bg, border: `2px solid ${border}` }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>{emoji}</span>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: accent, letterSpacing: '-0.02em', marginBottom: 14, margin: '0 0 14px' }}>{role}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {points.map(p => (
                    <li key={p} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151', fontWeight: 600 }}>
                      <span style={{ color: accent, fontWeight: 900 }}>✓</span>
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
      <section style={{ background: '#1A0800', padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 28, color: '#FFF7ED' }}>
          Ready to grow <span style={{ color: '#F97316' }}>smarter?</span>
        </h2>
        <Link href="/auth/signup" style={{ display: 'inline-block', padding: '16px 44px', borderRadius: 14, background: '#F97316', color: '#fff', fontWeight: 900, fontSize: 18, textDecoration: 'none', boxShadow: '0 6px 24px rgba(249,115,22,0.45)', letterSpacing: '-0.02em' }}>
          Get started free →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1A0800', borderTop: '1px solid rgba(255,247,237,0.06)', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: '#F97316', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>K</div>
          <span style={{ fontWeight: 800, color: '#F97316', fontSize: 13 }}>Kulima</span>
        </div>
        <p style={{ color: 'rgba(255,247,237,0.35)', fontSize: 12, margin: 0 }}>© 2026 Kulima — Smart Farm Management for Africa</p>
      </footer>

    </div>
  );
}
