import Link from 'next/link';

const SKY   = '#38BDF8';
const GOLD  = '#FCD34D';
const GREEN = '#4ADE80';
const AMBER = '#FCA74A';

const FEATURES = [
  { icon: '🌦️', title: 'Weather Intelligence',  desc: 'Hyper-local rainfall forecasts, drought alerts, and planting readiness scores updated every hour.', color: SKY,   bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.15)'  },
  { icon: '📈', title: 'Live Market Prices',     desc: 'Real-time crop prices from 50+ markets. Know the best place to sell before you leave the farm.',  color: GOLD,  bg: 'rgba(252,211,77,0.08)',  border: 'rgba(252,211,77,0.15)'  },
  { icon: '🤝', title: 'Buyer Marketplace',      desc: 'List produce and get direct offers from verified buyers. Negotiate and close deals in-app.',        color: GREEN, bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.15)'  },
  { icon: '🔬', title: 'AI Crop Doctor',         desc: 'Photograph a sick crop. Get instant disease diagnosis and step-by-step treatment advice.',          color: AMBER, bg: 'rgba(252,167,74,0.08)',  border: 'rgba(252,167,74,0.15)'  },
  { icon: '🔔', title: 'Smart Alerts',           desc: 'Price spikes, rain warnings, and buyer offers sent to your phone the moment they happen.',          color: GOLD,  bg: 'rgba(252,211,77,0.07)',  border: 'rgba(252,211,77,0.13)'  },
  { icon: '📊', title: 'Farm Analytics',         desc: 'Track earnings, yield history, and activity across all your farms at a glance.',                    color: GREEN, bg: 'rgba(74,222,128,0.07)',  border: 'rgba(74,222,128,0.13)'  },
] as const;

const ROLES = [
  {
    emoji: '🌾', role: 'Farmers', accent: GREEN,
    bg: 'rgba(74,222,128,0.07)', border: 'rgba(74,222,128,0.18)',
    points: ['Weather & planting guide', 'Live crop prices daily', 'Sell directly to buyers', 'AI disease detection', 'AgriScore credit identity'],
  },
  {
    emoji: '🛒', role: 'Buyers', accent: GOLD,
    bg: 'rgba(252,211,77,0.07)', border: 'rgba(252,211,77,0.18)',
    points: ['Browse verified listings', 'Make direct crop offers', 'Track your order pipeline', 'Market trend data', 'Escrow-protected payments'],
  },
  {
    emoji: '🚚', role: 'Suppliers', accent: SKY,
    bg: 'rgba(56,189,248,0.07)', border: 'rgba(56,189,248,0.18)',
    points: ['Reach farmers directly', 'Post product catalogue', 'Manage orders & delivery', 'Verified business profile', 'Transaction history'],
  },
] as const;

const STATS = [
  { value: '10,000+', label: 'Farmers',   color: GREEN },
  { value: '50+',     label: 'Markets',   color: GOLD  },
  { value: '30+',     label: 'Districts', color: SKY   },
  { value: '99%',     label: 'Uptime',    color: GREEN },
] as const;

const STEPS = [
  { step: '01', title: 'Create your account',    desc: 'Sign up with your email and choose your role — farmer, buyer, or supplier.', color: GREEN },
  { step: '02', title: 'Set up your profile',    desc: 'Add your farm details, crops, and location to unlock all platform features.', color: SKY  },
  { step: '03', title: 'Start trading & growing', desc: 'Access live prices, list produce, connect with buyers, and track your farm.', color: GOLD },
] as const;

const S = {
  dark:  '#0D1F12',
  mid:   '#132416',
  deep:  '#1A3120',
  muted: 'rgba(240,253,244,0.45)',
  dim:   'rgba(240,253,244,0.28)',
  faint: 'rgba(240,253,244,0.08)',
};

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: S.dark, color: '#F0FDF4' }}>

      {/* ── Nav ── */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
            style={{ background: GREEN, color: '#052E16' }}
          >
            K
          </div>
          <span className="text-lg font-black" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Kulima</span>
        </div>
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
      <section className="max-w-4xl mx-auto px-6 pt-12 pb-20 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8 text-xs font-bold tracking-widest uppercase"
          style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.22)', color: GREEN }}
        >
          🌍 Agricultural operating system for Africa
        </div>

        <h1 className="font-black leading-none mb-6" style={{ fontSize: 'clamp(2.75rem, 8vw, 5.5rem)', letterSpacing: '-0.045em' }}>
          Grow smarter.<br />
          <span style={{ color: GREEN }}>Sell better.</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: S.muted }}>
          Weather forecasts, live market prices, crop disease detection, and direct buyer connections — one platform for every farm role.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/auth/signup" className="landing-btn-primary glow-green" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
            Create free account
          </Link>
          <Link href="/auth/signin" className="landing-btn-outline" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
            Sign in
          </Link>
        </div>

        {/* Stats */}
        <div className="flex gap-8 sm:gap-14 justify-center mt-16 flex-wrap">
          {STATS.map(({ value, label, color }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black" style={{ color, letterSpacing: '-0.04em' }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: S.dim }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20" style={{ background: S.mid }}>
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-bold tracking-widest uppercase mb-4" style={{ color: S.dim }}>
            Platform capabilities
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-14" style={{ letterSpacing: '-0.03em' }}>
            Everything your farm needs
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, desc, color, bg, border }) => (
              <div key={title} className="p-6 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{ background: `${color}18` }}
                >
                  {icon}
                </div>
                <h3 className="font-bold mb-2" style={{ color }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: S.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 max-w-4xl mx-auto px-6">
        <p className="text-center text-xs font-bold tracking-widest uppercase mb-4" style={{ color: S.dim }}>
          Get started in minutes
        </p>
        <h2 className="text-3xl sm:text-4xl font-black text-center mb-14" style={{ letterSpacing: '-0.03em' }}>
          How Kulima works
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map(({ step, title, desc, color }) => (
            <div key={step} className="relative p-6 rounded-2xl" style={{ background: S.deep, border: `1px solid ${S.faint}` }}>
              <div
                className="text-4xl font-black mb-4 leading-none"
                style={{ color, opacity: 0.40, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
              >
                {step}
              </div>
              <h3 className="font-bold mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: S.muted }}>{desc}</p>
              <div className="absolute top-6 right-6 w-2 h-2 rounded-full" style={{ background: color }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="py-20" style={{ background: S.mid }}>
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-bold tracking-widest uppercase mb-4" style={{ color: S.dim }}>
            Built for everyone
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-14" style={{ letterSpacing: '-0.03em' }}>
            One platform. Every role.
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {ROLES.map(({ emoji, role, accent, bg, border, points }) => (
              <div key={role} className="p-6 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="text-xl font-black mb-4" style={{ color: accent, letterSpacing: '-0.02em' }}>{role}</h3>
                <ul className="space-y-2.5">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: S.muted }}>
                      <span className="shrink-0 mt-0.5 font-bold text-xs" style={{ color: accent }}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 text-center max-w-2xl mx-auto px-6">
        <h2 className="text-4xl sm:text-5xl font-black mb-5" style={{ letterSpacing: '-0.04em' }}>
          Ready to grow <span style={{ color: GREEN }}>smarter?</span>
        </h2>
        <p className="mb-10 leading-relaxed" style={{ color: S.muted }}>
          Join thousands of farmers already using Kulima across Uganda and East Africa.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/auth/signup" className="landing-btn-primary glow-green" style={{ fontSize: '1rem', padding: '1rem 2.25rem' }}>
            Get started free
          </Link>
          <Link href="/auth/signin" className="landing-btn-outline" style={{ fontSize: '1rem', padding: '1rem 2.25rem' }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 text-center text-xs" style={{ borderTop: `1px solid ${S.faint}`, color: S.dim }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-black" style={{ background: GREEN, color: '#052E16' }}>K</div>
          <span className="font-bold" style={{ color: GREEN }}>Kulima</span>
        </div>
        <p>© 2026 Kulima — Smart Farm Management for Africa</p>
      </footer>

    </div>
  );
}
