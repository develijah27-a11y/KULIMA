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
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control',   value: 'on' },
      { key: 'X-Content-Type-Options',   value: 'nosniff' },
      { key: 'X-Frame-Options',          value: 'DENY' },
      { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
      // Restrict powerful browser APIs — geolocation is self-origin only (used by weather)
      { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
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

// Only apply serwist webpack plugin in production — avoids Turbopack conflict in dev
const applySerwist = isDev
  ? (cfg) => cfg
  : require('@serwist/next').default({ swSrc: 'src/app/sw.ts', swDest: 'public/sw.js' });

module.exports = withBundleAnalyzer(applySerwist(nextConfig));
