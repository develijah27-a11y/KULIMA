const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  // Suppress Turbopack warning when no turbopack config is needed
  turbopack: {},
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'recharts',
      '@supabase/supabase-js',
      '@supabase/ssr',
      'zod',
      'framer-motion',
    ],
    // How long the client-side router cache holds prefetched RSC payloads.
    // Default in Next.js 15+ is 0 for dynamic pages (pages that use cookies/headers),
    // which means every navigation re-fetches even if the page was just prefetched.
    // Setting dynamic to 60 s means clicking any prefetched nav link within 60 s is
    // instant (no network round-trip, no loading skeleton). Mutations already call
    // router.refresh() which invalidates the affected entry immediately.
    staleTimes: {
      dynamic: 180,  // 3 min — keeps prefetched RSC payloads alive for a full browsing session
      static: 300,   // 5 min for fully-static pages
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },
  async headers() {
    // script-src needs 'unsafe-inline' for the theme-init script in
    // src/app/layout.tsx (a small static string, not user input — the audit
    // found no actual injection vector, so this is defense-in-depth for
    // resource loading, not a claim that inline scripts are individually
    // trusted). Origins here are every external host the app actually
    // references: Supabase (API + Realtime websocket), Google Fonts,
    // OpenWeatherMap, the Unsplash image hosts already allow-listed in
    // next.config.js's images.remotePatterns, and Leaflet (the live
    // delivery-tracking map in DeliveryTrackingMap.tsx/FarmMapClient.tsx) —
    // that map was silently non-functional in production because this CSP
    // blocked both leaflet.css (style-src) and the OSM tile/marker images
    // (img-src) it loads from unpkg.com and *.tile.openstreetmap.org.
    // tiles.stadiamaps.com was added later (src/lib/map-tiles.ts) as the
    // primary basemap and missed this allowlist at the time — same failure
    // mode, blank map tiles in production, caught in a later QA pass.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://plus.unsplash.com https://unpkg.com https://*.tile.openstreetmap.org https://tiles.stadiamaps.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openweathermap.org",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control',   value: 'on' },
      { key: 'X-Content-Type-Options',   value: 'nosniff' },
      { key: 'X-Frame-Options',          value: 'DENY' },
      { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
      // Allow camera on self-origin — used by CameraCapture in supplier/farmer product photos.
      // Geolocation is self-origin only (used by weather).
      { key: 'Permissions-Policy',       value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()' },
      { key: 'Content-Security-Policy',  value: csp },
    ];
    // HSTS: tell browsers to always use HTTPS for 2 years (production only)
    if (!isDev) {
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' });
    }
    return [
      {
        // Static media — immutable, 1 year
        source: '/:all*(svg|jpg|png|webp|avif|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Brand assets (icons/favicon/splash/logos) are NOT content-hashed —
        // unlike /_next/static, their filenames stay the same across deploys
        // even when the image content changes. A 1-year immutable cache here
        // means a logo/icon update can stay invisible to already-cached
        // clients for a year. Overrides the broader static-media rule above
        // with a short, revalidating cache instead. Bump the ?v= query param
        // on these files when you change their content for an instant bust.
        source: '/(icons|favicon|splash|logos)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
      {
        // Next.js content-hashed JS/CSS chunks — immutable, 1 year
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Security headers on every page and API response
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

// The service worker is NOT built via @serwist/next's webpack plugin here —
// dev runs under Turbopack (default since Next 15), which the plugin
// doesn't support (it hooks webpack's compilation pipeline, which never
// runs under Turbopack). public/sw.js is generated by a separate postbuild
// step instead: see scripts/build-sw.mjs and the "build" script below.
//
// Production builds are forced to webpack (`next build --webpack`) — every
// deployment since 2026-08-01 failed with
// "ENOENT .next/server/middleware.js.nft.json" during Turbopack's build,
// which silently failed to emit a middleware bundle/trace at all (Next.js
// 16.2.10). Nothing pushed to main in over a week ever actually went live
// as a result. `--webpack` is the documented escape hatch and its
// middleware NFT generation is far more mature; if a future Next.js
// release fixes the Turbopack build bug, this flag can be dropped.
module.exports = withBundleAnalyzer(nextConfig);
