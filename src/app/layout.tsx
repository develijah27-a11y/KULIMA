import type { Metadata } from "next";
import { Poppins, Inter, DM_Mono, Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/features/auth";
import { ToastContainer } from "@/components/ui/Toast";
import { PagePrefetcher } from "@/components/ui/PagePrefetcher";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";
import { OfflineSyncManager } from "@/components/shared/OfflineSyncManager";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import { Wordmark } from "@/components/ui/Wordmark";

// Self-hosted via next/font: fonts are fetched at build time and served from
// our own origin, eliminating the fonts.googleapis.com/fonts.gstatic.com
// round-trips that used to block first paint on every fresh page load.
// Streamlined font weights with swap display for minimal blocking and instant LCP
//
// preload:false on poppins/inter/dmMono — these are the authenticated
// dashboard's fonts, not the landing page's (landing uses oswald/plexSans/
// plexMono as primaries; poppins/inter/dmMono only ever appear as CSS
// fallback names in its font stacks, never actually needed on first
// render). Every font here is declared once in the root layout, so
// without this all 6 families' files were eagerly preloaded on EVERY
// page including the landing page — on a throttled connection those 3
// unused-there font fetches competed directly with the landing page's
// actual CSS/fonts for bandwidth. A live trace at ~400kbps/400ms latency
// (a rural-3G proxy) showed first paint not happening until ~32s;
// preload:false stops the eager fetch, the font still loads normally
// (and instantly, same-origin) once a page that actually uses it renders.
const poppins   = Poppins({ subsets: ["latin"], weight: ["400","600","700"], variable: "--font-poppins", display: "swap", preload: false });
const inter     = Inter({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-inter", display: "swap", preload: false });
const dmMono    = DM_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-dm-mono", display: "swap", preload: false });
const oswald    = Oswald({ subsets: ["latin"], weight: ["600","700"], variable: "--font-oswald", display: "swap" });
const plexSans  = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400","600"], variable: "--font-plex-sans", display: "swap" });
const plexMono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-plex-mono", display: "swap" });

// Must match Supabase Auth's site_url and WebAuthn rp_origins exactly —
// passkey sign-in only validates against this exact origin, so drifting
// this from what auth is actually configured for silently breaks
// biometric sign-in for anyone who lands here via search/shared links.
const SITE_URL = "https://www.cropifyapp.com";
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
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Cropify",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-image.png?v=2", width: 1200, height: 630, alt: "Cropify — Grow Smart. Farm Better." }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png?v=2"],
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

// Instant splash dismissal — transitions out immediately on DOMContentLoaded/interactive
// so the UI is immediately responsive without waiting for slow background network assets.
//
// This used to call el.parentNode.removeChild(el) 350ms after adding
// is-leaving — a raw DOM mutation on a node that's also part of React's own
// JSX tree (#app-splash is rendered directly in this file's markup below,
// not via a portal). On any page load slow enough that hydration hadn't
// finished by the time that removeChild fired (exactly the "slow rural
// connection" case this splash exists for), React would go to reconcile a
// node that vanilla JS had already ripped out from under it — a textbook
// cause of React error #418 (hydration mismatch), which was firing on
// every page load in production. is-leaving's CSS (globals.css) already
// animates to opacity:0 + visibility:hidden + pointer-events:none and
// stays there — the node never needs to be removed from the DOM at all,
// only hidden, so it's left in place for React to keep owning.
const splashScript = `
(function(){
  var done = false;
  function hide(){
    if (done) return;
    done = true;
    var el = document.getElementById('app-splash');
    if (el) el.classList.add('is-leaving');
  }
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(hide, 30);
  } else {
    document.addEventListener('DOMContentLoaded', hide);
    window.addEventListener('load', hide);
  }
  setTimeout(hide, 600);
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
        {/* ?v=12 cache-busts the updated Cropify logo & app icon assets */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg?v=12" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32.png?v=12" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16.png?v=12" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png?v=12" />
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
          <img
            className="app-splash-mark"
            src="/icons/icon-192.png?v=12"
            alt="Cropify"
            width={120}
            height={120}
            style={{ borderRadius: '22%', background: '#FFFFFF', padding: '6px' }}
          />
          <span className="app-splash-word"><Wordmark color="#FFFFFF" leafColor="#8BE9A8" style={{ fontSize: 'inherit' }} /></span>
          <span className="app-splash-tagline">Inform • Connect • Grow</span>
          <div className="app-splash-dots"><span /><span /><span /></div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        <AuthProvider>{children}</AuthProvider>
        <ToastContainer />
        <NavigationProgress />
        <PagePrefetcher />
        <ServiceWorkerRegistrar />
        <OfflineSyncManager />
        <OfflineBanner />
        <InstallPrompt />
      </body>
    </html>
  );
}
