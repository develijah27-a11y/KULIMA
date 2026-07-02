import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/features/auth";
import { ToastContainer } from "@/components/ui/Toast";
import { PagePrefetcher } from "@/components/ui/PagePrefetcher";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Kulima — Smart Farm Management for Uganda",
  description:
    "Real-time weather forecasts, market prices, crop disease detection, and buyer connections — all in one platform for Ugandan smallholder farmers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kulima",
  },
};

// Runs before first paint — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var saved = localStorage.getItem('kulima-theme');
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
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#22C55E" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0A0B0D" media="(prefers-color-scheme: dark)" />
        {/* Preconnect to external origins — reduces DNS lookup time */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://hjvnkintvjogwljchwcq.supabase.co" />
        <link rel="dns-prefetch" href="https://api.openweathermap.org" />
        {/* display=swap in the URL prevents font from blocking render */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=DM+Mono:wght@400&display=swap"
        />
      </head>
      <body
        className={cn("min-h-screen antialiased")}
        style={{ background: '#1A0800', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
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
