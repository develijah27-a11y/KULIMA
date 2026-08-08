import type { Metadata } from "next";
import { Poppins, Inter, DM_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Cropify — Smart Farm Management for Uganda",
  description:
    "Real-time weather forecasts, market prices, crop disease detection, and buyer connections — all in one platform for Ugandan smallholder farmers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cropify",
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
        {/* ?v=5 cache-busts the Cropify icon redesign — these paths aren't
            content-hashed, and the old files were served with a 1-year
            immutable Cache-Control, so browsers/CDN need a new URL to notice
            the change. Bump this version any time icon.svg's content changes. */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg?v=5" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32.png?v=5" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16.png?v=5" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png?v=5" />
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
                <stop offset="0" stopColor="#22A35C" />
                <stop offset="1" stopColor="#0B4020" />
              </linearGradient>
            </defs>
            <rect width="256" height="256" rx="57" fill="url(#splashBg)" />
            {/* A "C" ring opening onto a sprouting seed — the initial and
                the act of growth it stands for, in one mark. */}
            <path d="M182.07,165.86 A66,66 0 1 1 182.07,90.14" stroke="#F6EFDD" strokeWidth="34" strokeLinecap="round" />
            <circle cx="187" cy="128" r="16" fill="#FFA726" />
            <path d="M187,110 Q174,92 187,74 Q200,92 187,110 Z" fill="#F6EFDD" />
          </svg>
          <span className="app-splash-word">Cropify</span>
          <span className="app-splash-tagline">Smart Farm Management</span>
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
