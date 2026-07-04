import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST?: string[] };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST || [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  // When a navigation can't be served from the network or any runtime
  // cache (offline + never visited before), show the in-app offline
  // screen instead of the browser's native "no internet" error.
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.mode === 'navigate',
      },
    ],
  },

  runtimeCaching: [
    // ── RSC payloads ──────────────────────────────────────────────────────────
    // Both prefetch (Next-Router-Prefetch: 1) and navigation (no prefetch header)
    // RSC requests go to the same URLs — unify them in one cache so the prefetched
    // payload is served immediately when the user actually navigates.
    // StaleWhileRevalidate: respond from cache instantly, then refresh in background.
    // 200 entries covers every route across all roles; 5 min TTL.
    {
      matcher: ({ request }) => request.headers.get('RSC') === '1',
      handler: new StaleWhileRevalidate({
        cacheName: 'agrinova-rsc',
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 300 })],
      }),
    },

    // ── API data ──────────────────────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/weather'),
      handler: new StaleWhileRevalidate({
        cacheName: 'agrinova-weather',
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 1800 })],
      }),
    },
    {
      matcher: ({ url }) => (
        url.pathname.startsWith('/api/prices') ||
        url.pathname.startsWith('/api/market-prices') ||
        url.pathname.startsWith('/api/cash-crop-prices')
      ),
      handler: new StaleWhileRevalidate({
        cacheName: 'agrinova-prices',
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
      }),
    },
    {
      matcher: ({ url }) => (
        url.pathname.startsWith('/api/farms') ||
        url.pathname.startsWith('/api/farm-') ||
        url.pathname.startsWith('/api/inventory') ||
        url.pathname.startsWith('/api/listings') ||
        url.pathname.startsWith('/api/planting')
      ),
      handler: new NetworkFirst({
        cacheName: 'agrinova-farmer',
        networkTimeoutSeconds: 5,
        plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 86400 })],
      }),
    },

    // ── Static assets ─────────────────────────────────────────────────────────
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'agrinova-images',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2592000 })],
      }),
    },
    {
      matcher: ({ url }) => url.origin === 'https://fonts.googleapis.com',
      handler: new CacheFirst({
        cacheName: 'agrinova-fonts',
        plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 })],
      }),
    },

    // ── Full-page HTML navigation ─────────────────────────────────────────────
    // Only fires for hard refreshes (when the Next.js router isn't active yet).
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'agrinova-pages',
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 86400 })],
      }),
    },
  ],
});

serwist.addEventListeners();
