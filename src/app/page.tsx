import Link from 'next/link';

const FEATURES = [
  ['🌦️', 'Weather Intelligence', 'Hyper-local rainfall forecasts, drought alerts, and planting readiness scores updated every hour.'],
  ['📈', 'Live Market Prices', 'Real-time crop prices from 50+ markets. Know the best place to sell before you leave the farm.'],
  ['🤝', 'Buyer Marketplace', 'List your produce and get direct offers from verified buyers. Negotiate and close deals in-app.'],
  ['🔬', 'AI Crop Doctor', 'Photograph a sick leaf. Get instant disease diagnosis and step-by-step treatment advice.'],
  ['🔔', 'Smart Alerts', 'Price spikes, rain warnings, and buyer offers sent to your phone the moment they happen.'],
  ['📊', 'Farm Analytics', 'Track earnings, yield history, and activity across all your farms at a glance.'],
] as const;

const ROLES = [
  {
    emoji: '🌾', role: 'Farmers', accent: '#22c55e',
    bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)',
    points: ['Weather & planting guide', 'Live crop prices daily', 'Sell directly to buyers', 'AI disease detection'],
  },
  {
    emoji: '🛒', role: 'Buyers', accent: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)',
    points: ['Browse verified listings', 'Make direct crop offers', 'Track your order pipeline', 'Market trend data'],
  },
  {
    emoji: '🛡️', role: 'Admins', accent: '#a78bfa',
    bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)',
    points: ['Full platform analytics', 'User management tools', 'Broadcast alerts', 'Price data management'],
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-soil)', color: 'var(--color-cream)' }}>

      {/* ── Top nav ── */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight" style={{ color: 'var(--color-sprout)', letterSpacing: '-0.03em' }}>
          Kulima
        </span>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="landing-btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
            Sign in
          </Link>
          <Link href="/auth/signup" className="landing-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-6 pt-14 pb-20 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--color-sprout)' }}
        >
          🌍 Agricultural platform for Africa
        </div>

        <h1
          className="font-black leading-none mb-6"
          style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', letterSpacing: '-0.04em' }}
        >
          Grow smarter.<br />
          <span style={{ color: 'var(--color-sprout)' }}>Sell better.</span>
        </h1>

        <p
          className="text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'rgba(249,250,251,0.5)' }}
        >
          Weather forecasts, live market prices, crop disease detection, and direct buyer connections — one platform for every farm role.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/auth/signup" className="landing-btn-primary">Create free account</Link>
          <Link href="/auth/signin" className="landing-btn-outline">Sign in</Link>
        </div>

        {/* Stats strip */}
        <div className="flex gap-10 justify-center mt-16 flex-wrap">
          {[['10,000+', 'Farmers'], ['50+', 'Markets'], ['30+', 'Districts']].map(([num, label]) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black" style={{ letterSpacing: '-0.04em' }}>{num}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(249,250,251,0.35)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20" style={{ background: 'var(--color-surface)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold tracking-widest uppercase mb-14" style={{ color: 'rgba(249,250,251,0.3)' }}>
            Everything you need
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(([icon, title, desc]) => (
              <div
                key={title}
                className="p-6 rounded-2xl"
                style={{ background: 'var(--color-surface2)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(249,250,251,0.45)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role cards ── */}
      <section className="py-20 max-w-5xl mx-auto px-6">
        <p className="text-center text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(249,250,251,0.3)' }}>
          Built for everyone
        </p>
        <h2 className="text-3xl sm:text-4xl font-black text-center mb-12" style={{ letterSpacing: '-0.03em' }}>
          One platform. Every role.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {ROLES.map(({ emoji, role, accent, bg, border, points }) => (
            <div key={role} className="p-6 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="text-4xl mb-3">{emoji}</div>
              <h3 className="font-bold text-lg mb-4" style={{ color: accent }}>{role}</h3>
              <ul className="space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(249,250,251,0.65)' }}>
                    <span style={{ color: accent }} className="shrink-0 mt-0.5 font-bold">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 text-center" style={{ background: 'var(--color-surface)' }}>
        <div className="max-w-lg mx-auto px-6">
          <h2 className="text-4xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>
            Ready to grow smarter?
          </h2>
          <p className="mb-8 leading-relaxed" style={{ color: 'rgba(249,250,251,0.45)' }}>
            Join thousands of farmers already using Kulima across Uganda and East Africa.
          </p>
          <Link href="/auth/signup" className="landing-btn-primary" style={{ fontSize: '1rem', padding: '1rem 2rem' }}>
            Create your free account
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-xs" style={{ color: 'rgba(249,250,251,0.2)' }}>
        © 2025 Kulima — Smart Farm Management for Africa
      </footer>
    </div>
  );
}
