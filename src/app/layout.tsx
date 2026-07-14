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
        <AuthProvider>{children}</AuthProvider>
        <ToastContainer />
        <NavigationProgress />
        <PagePrefetcher />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
