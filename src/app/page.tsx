import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* ── Hero ── */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold tracking-wide mb-6">
            🌿 Kulima — Smart Farm Management
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Get real-time weather forecasts, seasonal planning, market prices, and buyer connections — all in one intelligent agricultural platform.
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            The complete operating system for African agriculture — from the field to the market.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth/signin"
              className="px-7 py-3.5 bg-green-600 text-white rounded-xl text-base font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/25"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-7 py-3.5 border-2 border-green-600 text-green-700 rounded-xl text-base font-semibold hover:bg-green-50 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

      {/* ── Dashboards strip ── */}
      <div className="bg-green-900 py-14">
        <div className="container mx-auto px-4">
          <p className="text-center text-green-300 text-sm font-semibold tracking-widest uppercase mb-10">
            Five powerful dashboards · One shared platform
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">

            {[
              ['🌾', 'Farmer Dashboard', 'weather · crops · market · buyer connections'],
              ['🛒', 'Buyer Dashboard', 'market trends · crop sourcing · order tracking'],
              ['📦', 'Supplier Dashboard', 'inventory · regional demand · product listings'],
              ['🛡️', 'Admin Dashboard', 'user management · ecosystem analytics · moderation'],
              ['👑', 'Super Admin', 'platform metrics · enterprise scaling (coming soon)'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="bg-green-800/50 border border-green-700 rounded-2xl p-5 hover:bg-green-800 transition-colors">
                <div className="text-3xl mb-2">{icon}</div>
                <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
                <p className="text-green-300/70 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* ── Core features ── */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for every player in the agricultural value chain</h2>
          <p className="text-gray-600 max-w-xl mx-auto">One shared dashboard shell with role-based modules. No duplication, no friction.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">

          {[
            ['🌦', 'Weather Intelligence', 'Rainfall forecasts, drought alerts, planting readiness scores — powered by live weather data so you always know what to do next.'],
            ['🌱', 'Seasonal Planner', 'Planting schedules, fertilizer reminders, weeding and harvest timelines — planned automatically based on your region and crops.'],
            ['💰', 'Market Intelligence', 'Live crop prices, best markets to sell to, and buyer demand signals — make decisions with real market data.'],
            ['🛒', 'Marketplace', 'List your produce, receive buyer requests, negotiate deals — all in-app with verified profiles.'],
            ['🔔', 'Smart Notifications', 'Weather alerts, price spikes, task reminders — never miss an action that matters to your farm.'],
            ['📊', 'Farm Analytics', 'Production history, earnings estimates, activity tracking — understand your farm at a glance.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-lg hover:border-green-200 transition-all">
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}

        </div>
      </div>

      {/* ── Architecture highlight ── */}
      <div className="bg-gray-50 py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">One intelligent agricultural operating system</h2>
          <p className="text-gray-600 mb-10 leading-relaxed">
            Not multiple disconnected dashboards. One shared shell — sidebar, navigation, notifications, settings, and profile — with dynamic role modules loaded based on who is signed in. Less code, cleaner data, faster to scale.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {[
              ['🧩', 'Role-Based Modules', 'Each user role gets exactly the widgets they need.'],
              ['🔒', 'Shared Auth System', 'One sign-in, one session, role-aware everywhere.'],
              ['📐', 'One Dashboard System', 'Same layout everywhere. Consistent UX for everyone.'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 text-left">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* ── Priority order ── */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Build in this order</h2>
          <div className="space-y-4">

            {[
              ['✅', 'First', 'Shared dashboard architecture + Authentication & role system + Farmer dashboard'],
              ['🔵', 'Second', 'Buyer dashboard'],
              ['🟡', 'Third', 'Supplier dashboard'],
              ['⚪', 'Last', 'Admin dashboard (multi-region, enterprise)'],
            ].map(([icon, label, desc]) => (
              <div key={label} className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-6">
                <span className="text-2xl mt-0.5">{icon}</span>
                <div>
                  <span className="font-bold text-green-700 text-sm uppercase tracking-wide">{label} —</span>
                  <span className="text-gray-700 text-sm ml-1">{desc}</span>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="bg-green-900 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to grow smarter?</h2>
          <p className="text-green-200 mb-8 max-w-xl mx-auto">
            Join Kulima — the one platform bringing together weather intelligence, seasonal planning, market prices, and buyer connections for African farmers.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-white text-green-900 rounded-xl font-bold hover:bg-green-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="py-8 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} Kulima — Smart Farm Management for Africa</p>
      </footer>
    </div>
  );
}
