import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-soil)', color: 'var(--color-cream)' }}>

      {/* ── Hero ── */}
      <div className="container mx-auto px-6 pt-24 pb-20 text-center max-w-3xl">
        <span
          className="inline-block px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-8"
          style={{ background: 'var(--color-surface2)', color: 'var(--color-sprout)' }}
        >
          Kulima · Smart Farm Management
        </span>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          One platform.
          <br />
          <span style={{ color: 'var(--color-sprout)' }}>Every farm role.</span>
        </h1>

        <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(247,242,232,0.65)' }}>
          Weather intelligence, seasonal planning, market prices, and buyer connections — built for African agriculture.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/auth/signin"
            className="landing-btn-primary"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="landing-btn-outline"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* ── Architecture ── */}
      <div className="py-20" style={{ background: 'var(--color-surface)' }}>
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            One intelligent agricultural operating system
          </h2>
          <p className="mb-12 leading-relaxed" style={{ color: 'rgba(247,242,232,0.6)' }}>
            One shared shell — sidebar, navigation, notifications, settings, and profile — with dynamic role modules loaded based on who is signed in.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
            {[
              ['🧩', 'Role-Based Modules', 'Each user role gets exactly the widgets they need — farmer, buyer, supplier, admin.'],
              ['🔒', 'Shared Auth System', 'One sign-in, one session, role-aware everywhere.'],
              ['📐', 'One Dashboard Shell', 'Same layout everywhere. Consistent UX for every user, every role.'],
            ].map(([icon, title, desc]) => (
              <div
                key={title as string}
                className="rounded-2xl p-6"
                style={{ background: 'var(--color-surface2)', border: '1px solid rgba(74,124,63,0.2)' }}
              >
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold mb-1">{title as string}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(247,242,232,0.55)' }}>{desc as string}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="py-16 text-center" style={{ background: 'var(--color-surface2)' }}>
        <div className="container mx-auto px-6 max-w-xl">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
            Ready to grow smarter?
          </h2>
          <p className="mb-8 leading-relaxed" style={{ color: 'rgba(247,242,232,0.6)' }}>
            Join Kulima — the platform built to serve every player in the African agricultural value chain.
          </p>
          <Link
            href="/auth/signup"
            className="landing-btn-primary"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="py-8 text-center text-sm" style={{ color: 'rgba(247,242,232,0.3)' }}>
        <p>© 2025 Kulima — Smart Farm Management for Africa</p>
      </footer>
    </div>
  );
}
