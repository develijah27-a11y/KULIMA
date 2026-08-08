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
        cacheName: 'cropify-rsc',
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 300 })],
      }),
    },

    // ── API data ──────────────────────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/weather'),
      handler: new StaleWhileRevalidate({
        cacheName: 'cropify-weather',
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
        cacheName: 'cropify-prices',
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
        cacheName: 'cropify-farmer',
        networkTimeoutSeconds: 5,
        plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 86400 })],
      }),
    },

    // ── Static assets ─────────────────────────────────────────────────────────
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'cropify-images',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2592000 })],
      }),
    },
    {
      matcher: ({ url }) => url.origin === 'https://fonts.googleapis.com',
      handler: new CacheFirst({
        cacheName: 'cropify-fonts',
        plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 })],
      }),
    },

    // ── Full-page HTML navigation ─────────────────────────────────────────────
    // Only fires for hard refreshes (when the Next.js router isn't active yet).
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'cropify-pages',
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 86400 })],
      }),
    },
  ],
});

serwist.addEventListeners();

// ── Web Push ─────────────────────────────────────────────────────────────
// Shows an OS-level notification even when the app isn't open — this is
// what actually reaches a driver whose phone is locked, or a farmer/supplier
// who isn't currently in the app, unlike the in-app notification bell which
// only updates while a tab is active.
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const title = payload.title ?? 'Cropify';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag,
      data: { url: payload.url ?? '/dashboard' },
    }),
  );
});

// Focus an already-open Cropify tab if one exists and navigate it,
// otherwise open a new one — standard "tap the notification" behavior.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/dashboard';
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        if ('focus' in client) {
          await (client as WindowClient).focus();
          if ('navigate' in client) await (client as WindowClient).navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
