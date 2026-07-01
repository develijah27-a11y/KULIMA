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
    return [
      {
        // Static media — immutable, 1 year
        source: '/:all*(svg|jpg|png|webp|avif|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Next.js content-hashed JS/CSS chunks — immutable, 1 year
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Security + DNS prefetch enabled for all pages
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

// Only apply serwist webpack plugin in production — avoids Turbopack conflict in dev
const applySerwist = isDev
  ? (cfg) => cfg
  : require('@serwist/next').default({ swSrc: 'src/app/sw.ts', swDest: 'public/sw.js' });

module.exports = withBundleAnalyzer(applySerwist(nextConfig));
