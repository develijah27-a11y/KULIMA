import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST?: string[] };

const OFFLINE_FALLBACK_CACHE = 'cropify-offline-fallback-v1';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST || [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,

  runtimeCaching: [
    // ── HTML Navigation (2G resilience with fallback to /offline) ─────────────
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'cropify-pages-v2',
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 86400 * 3, // 3 days
          }),
        ],
      }),
    },

    // ── API data ──────────────────────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/weather'),
      handler: new NetworkFirst({
        cacheName: 'cropify-weather-v2',
        networkTimeoutSeconds: 4, // Adaptive 4s for rural 2G
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

    // ── Static assets ─────────────────────────────────────────────────────────
    {
      matcher: ({ request }) => request.destination === 'image',
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
  ],
});

// Cache the offline fallback page during service worker installation
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(OFFLINE_FALLBACK_CACHE).then((cache) => {
      return cache.add('/offline').catch((err) => {
        console.warn('[sw] Could not precache /offline during install:', err);
      });
    })
  );
});

// Provide /offline fallback when navigation fails completely
serwist.setCatchHandler(async ({ request }) => {
  if (request.destination === 'document' || (request as any).mode === 'navigate') {
    const offlineCache = await caches.open(OFFLINE_FALLBACK_CACHE);
    const fallback = await offlineCache.match('/offline');
    if (fallback) return fallback;
  }
  return Response.error();
});

serwist.addEventListeners();

// ── Background Sync ───────────────────────────────────────────────────────
// When connection resumes or Android triggers background sync, notify
// the app window so OfflineSyncManager can flush any pending outbox records.
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'cropify-sync') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CROP_SYNC_TRIGGER' });
        });
      })
    );
  }
});

// ── Message channel ───────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Web Push ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const title = payload.title ?? 'Cropify';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/notification-badge-96.png',
      tag: payload.tag,
      data: { url: payload.url ?? '/dashboard' },
    }),
  );
});

// Focus an already-open Cropify tab if one exists and navigate it,
// otherwise open a new one.
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
