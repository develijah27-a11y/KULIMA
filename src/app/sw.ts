import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: [
    { matcher: ({ url }) => url.pathname.startsWith('/api/weather'), handler: 'StaleWhileRevalidate', options: { cacheName: 'kulima-weather', expiration: { maxEntries: 20, maxAgeSeconds: 1800 } } },
    { matcher: ({ url }) => url.pathname.startsWith('/api/prices'), handler: 'StaleWhileRevalidate', options: { cacheName: 'kulima-prices', expiration: { maxEntries: 50, maxAgeSeconds: 300 } } },
    { matcher: ({ url }) => url.pathname.startsWith('/api/farmer'), handler: 'NetworkFirst', options: { cacheName: 'kulima-farmer', networkTimeoutSeconds: 5, expiration: { maxEntries: 10, maxAgeSeconds: 86400 } } },
    { matcher: ({ request }) => request.destination === 'image', handler: 'CacheFirst', options: { cacheName: 'kulima-images', expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } } },
    { matcher: ({ url }) => url.origin === 'https://fonts.googleapis.com', handler: 'CacheFirst', options: { cacheName: 'kulima-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } } },
    { matcher: ({ request }) => request.mode === 'navigate', handler: 'NetworkFirst', options: { cacheName: 'kulima-pages', networkTimeoutSeconds: 3, expiration: { maxEntries: 20, maxAgeSeconds: 86400 } } },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
