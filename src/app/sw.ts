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
    // NetworkFirst, not StaleWhileRevalidate: farmers use this to decide
    // whether to plant/spray/spray today, so a fresh network read (even a
    // few seconds slower) beats instantly showing a cached reading that
    // could be hours old. Falls back to cache only if the network is
    // unreachable. Cache bucket renamed (v2) to drop whatever any
    // already-installed device cached under the old always-serve-cached-
    // first strategy.
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/weather'),
      handler: new NetworkFirst({
        cacheName: 'cropify-weather-v2',
        networkTimeoutSeconds: 5,
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
      // CacheFirst never re-checks the network once an entry exists, so the
      // logo/icon files (same filenames, revised many times this session)
      // stayed stuck on whatever version a returning visitor's browser
      // cached during their earliest visit within the last 30 days — a real
      // deploy could ship a brand new logo and their device would keep
      // showing the old one regardless. Bucket renamed (v2) to drop
      // whatever's already cached, same fix already used below for the
      // weather-cache strategy change.
      handler: new CacheFirst({
        cacheName: 'cropify-images-v2',
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
        networkTimeoutSeconds: 15,
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
      // Android re-tints and masks `badge` to a flat monochrome silhouette
      // for the status bar — feeding it the full-color app icon (like this
      // used to) makes the OS's masking turn it into an illegible smudge.
      // A dedicated single-shape icon is required, separate from `icon`
      // (which still shows full color in the notification tray itself).
      badge: '/icons/notification-badge-96.png',
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
