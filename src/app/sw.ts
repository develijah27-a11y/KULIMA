import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST?: string[] };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST || [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/weather'),
      handler: new StaleWhileRevalidate({
        cacheName: 'kulima-weather',
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 1800 })],
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/prices'),
      handler: new StaleWhileRevalidate({
        cacheName: 'kulima-prices',
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/farmer'),
      handler: new NetworkFirst({
        cacheName: 'kulima-farmer',
        networkTimeoutSeconds: 5,
        plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 })],
      }),
    },
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'kulima-images',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2592000 })],
      }),
    },
    {
      matcher: ({ url }) => url.origin === 'https://fonts.googleapis.com',
      handler: new CacheFirst({
        cacheName: 'kulima-fonts',
        plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 })],
      }),
    },
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'kulima-pages',
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 86400 })],
      }),
    },
  ],
});

serwist.addEventListeners();
