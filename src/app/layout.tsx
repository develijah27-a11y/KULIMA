import type { Metadata } from "next";
import { Poppins, Inter, DM_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/features/auth";
import { ToastContainer } from "@/components/ui/Toast";
import { PagePrefetcher } from "@/components/ui/PagePrefetcher";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";

// Self-hosted via next/font: fonts are fetched at build time and served from
// our own origin, eliminating the fonts.googleapis.com/fonts.gstatic.com
// round-trips that used to block first paint on every fresh page load.
const poppins = Poppins({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-poppins", display: "swap" });
const inter   = Inter({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-inter", display: "swap" });
const dmMono  = DM_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: "AgriNova — Smart Farm Management for Uganda",
  description:
    "Real-time weather forecasts, market prices, crop disease detection, and buyer connections — all in one platform for Ugandan smallholder farmers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AgriNova",
  },
};

// Runs before first paint — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var saved = localStorage.getItem('agrinova-theme');
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
        {/* ?v=2 cache-busts the AgriNova rebrand icons — these paths aren't
            content-hashed, and the old files were served with a 1-year
            immutable Cache-Control, so browsers/CDN need a new URL to notice
            the change. Bump this version any time icon.svg's content changes. */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32.png?v=2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16.png?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png?v=2" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#166B3A" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0F172A" media="(prefers-color-scheme: dark)" />
        {/* Preconnect to external origins — reduces DNS lookup time */}
        <link rel="dns-prefetch" href="https://hjvnkintvjogwljchwcq.supabase.co" />
        <link rel="dns-prefetch" href="https://api.openweathermap.org" />
      </head>
      <body
        className={cn("min-h-screen antialiased", poppins.variable, inter.variable, dmMono.variable)}
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
      >
        {/* Branded splash — bridges the OS's plain icon-on-green-background
            splash and the real UI. The overlay markup paints immediately
            (plain CSS, no JS needed to appear); splashScript below decides
            when to dismiss it. */}
        <div id="app-splash" className="app-splash" aria-hidden="true">
          <svg className="app-splash-mark" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="splashBg" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#2FA34F" />
                <stop offset="1" stopColor="#166B3A" />
              </linearGradient>
            </defs>
            <rect width="256" height="256" rx="57" fill="url(#splashBg)" />
            <circle cx="128" cy="150" r="22" fill="#FFA726" />
            <path d="M128,58 L192,200 L166,200 L150,158 L106,158 L90,200 L64,200 Z" fill="#FFFFFF" />
            <path d="M128,58 L150,158" stroke="#166B3A" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
            <path d="M172,72 Q186,86 172,102 Q158,86 172,72 Z" fill="#7CC576" />
            <path d="M172,76 L172,98" stroke="#FFF7E6" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M58,210 Q128,200 198,210" stroke="#FFF7E6" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.55" />
            <path d="M52,226 Q128,217 204,226" stroke="#FFF7E6" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.35" />
          </svg>
          <span className="app-splash-word">AgriNova</span>
          <span className="app-splash-tagline">Smart Farm Management</span>
          <div className="app-splash-dots"><span /><span /><span /></div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        <AuthProvider>{children}</AuthProvider>
        <ToastContainer />
        <NavigationProgress />
        <PagePrefetcher />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
