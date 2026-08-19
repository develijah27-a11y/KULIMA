import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST?: string[] };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST || [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,

  runtimeCaching: [
    // ── API data ──────────────────────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/weather'),
      handler: new NetworkFirst({
        cacheName: 'cropify-weather-v2',
        networkTimeoutSeconds: 10,
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
