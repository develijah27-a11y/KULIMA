import type { Metadata } from "next";
import { Poppins, Inter, DM_Mono, Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/features/auth";
import { ToastContainer } from "@/components/ui/Toast";
import { PagePrefetcher } from "@/components/ui/PagePrefetcher";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/shared/InstallPrompt";

// Self-hosted via next/font: fonts are fetched at build time and served from
// our own origin, eliminating the fonts.googleapis.com/fonts.gstatic.com
// round-trips that used to block first paint on every fresh page load.
const poppins = Poppins({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-poppins", display: "swap" });
const inter   = Inter({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-inter", display: "swap" });
const dmMono  = DM_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-dm-mono", display: "swap" });

// Landing-page-only type system ("cargo manifest" redesign) — industrial
// stamped headlines, plain body text, monospace for anything data-like
// (prices, ledger entries) so the price ticker and role cards read as
// authentic records rather than decorative UI.
const oswald    = Oswald({ subsets: ["latin"], weight: ["500","600","700"], variable: "--font-oswald", display: "swap" });
const plexSans  = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-plex-sans", display: "swap" });
const plexMono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-plex-mono", display: "swap" });

const SITE_URL = "https://cropify-ug.vercel.app";
const SITE_TITLE = "Cropify — Smart Farm Management for Uganda";
const SITE_DESCRIPTION =
  "Real-time weather forecasts, market prices, crop disease detection, and buyer connections — all in one platform for Ugandan smallholder farmers.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  metadataBase: new URL(SITE_URL),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cropify",
  },
  // Explicit OG/Twitter cards so search results and shared links show the
  // Cropify logo — without these, some crawlers/platforms fall back to a
  // blank or generic preview instead of our branding.
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Cropify",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Cropify — Grow Smart. Farm Better." }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

// Runs before first paint — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var saved = localStorage.getItem('cropify-theme');
    var sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved ? saved === 'dark' : sysDark;
    document.documentElement.classList.toggle('dark', isDark);
  } catch(e){}
})();
`;

// Dismisses the splash on window `load` (all resources in, not just DOM
// parsed) rather than a fixed CSS timer — on the slow rural connections
// this app targets, a blind timer tied to the splash's own first-paint
// clock can finish well before the rest of the page has actually loaded.
// Enforces a minimum hold so it doesn't just flash on fast connections, and
// a hard timeout so it can never get stuck if `load` never fires.
const splashScript = `
(function(){
  var MIN_MS = 500, MAX_MS = 4000, start = Date.now(), done = false;
  function hide(){
    if (done) return;
    done = true;
    var el = document.getElementById('app-splash');
    if (el) el.classList.add('is-leaving');
  }
  function schedule(){ setTimeout(hide, Math.max(0, MIN_MS - (Date.now() - start))); }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
  setTimeout(hide, MAX_MS);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme init — must be first script, blocks paint intentionally */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* ?v=8 cache-busts the final approved Cropify logo — these paths
            aren't content-hashed, and the old files were served with a
            1-year immutable Cache-Control, so browsers/CDN need a new URL
            to notice the change. Bump this version any time icon.svg's
            content changes. */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg?v=8" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32.png?v=8" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16.png?v=8" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png?v=8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#166B3A" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0F172A" media="(prefers-color-scheme: dark)" />
        {/* Preconnect to Supabase — every page hits it for session/auth
            checks, sign-in included, so this pays for the DNS+TLS handshake
            ahead of the actual request instead of during it (worth 100-300ms
            on a mobile connection, which is exactly what makes sign-in feel
            slow). dns-prefetch alone (kept as a fallback for browsers that
            cap preconnect count) only resolves the name, not the handshake. */}
        <link rel="preconnect" href="https://hjvnkintvjogwljchwcq.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://hjvnkintvjogwljchwcq.supabase.co" />
        <link rel="dns-prefetch" href="https://api.openweathermap.org" />
      </head>
      <body
        className={cn("min-h-screen antialiased", poppins.variable, inter.variable, dmMono.variable, oswald.variable, plexSans.variable, plexMono.variable)}
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
      >
        {/* Branded splash — bridges the OS's plain icon-on-green-background
            splash and the real UI. The overlay markup paints immediately
            (plain CSS, no JS needed to appear); splashScript below decides
            when to dismiss it. */}
        <div id="app-splash" className="app-splash" aria-hidden="true">
          <svg className="app-splash-mark" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="256" height="256" rx="57" fill="#FFFFFF" />
            {/* Thick green "C" ring wrapping a rising sun over field mounds,
                with a leaf overlapping the ring's lower terminus — matches
                public/icons/icon.svg; keep both in sync. */}
            <defs>
              <linearGradient id="splashRingGrad" x1="195" y1="71" x2="195" y2="185" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#0A5C36" />
                <stop offset="1" stopColor="#34A853" />
              </linearGradient>
              <linearGradient id="splashLeafGrad" x1="198" y1="178" x2="238" y2="222" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#0A5C36" />
                <stop offset="1" stopColor="#8BC34A" />
              </linearGradient>
            </defs>
            <path d="M195.4,184.6 A88,88 0 1 1 195.4,71.4" stroke="url(#splashRingGrad)" strokeWidth="46" strokeLinecap="round" />
            <path d="M198,178 Q198.8,217.5 238,222 Q237.2,182.5 198,178 Z" fill="url(#splashLeafGrad)" />
            <g stroke="#FFB300" strokeWidth="7" strokeLinecap="round">
              <path d="M132,112 L148,112" />
              <path d="M125,129 L136.3,140.3" />
              <path d="M108,136 L108,152" />
              <path d="M91,129 L79.7,140.3" />
              <path d="M84,112 L68,112" />
              <path d="M91,95 L79.7,83.7" />
              <path d="M108,88 L108,72" />
              <path d="M125,95 L136.3,83.7" />
            </g>
            <circle cx="108" cy="112" r="19" fill="#FFB300" />
            <path d="M50,178 Q92,148 130,166 Q152,153 176,166 L176,196 L50,196 Z" fill="#8BC34A" />
          </svg>
          <span className="app-splash-word">Cropify</span>
          <span className="app-splash-tagline">Grow smart. Farm better.</span>
          <div className="app-splash-dots"><span /><span /><span /></div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        <AuthProvider>{children}</AuthProvider>
        <ToastContainer />
        <NavigationProgress />
        <PagePrefetcher />
        <ServiceWorkerRegistrar />
        <InstallPrompt />
      </body>
    </html>
  );
}
