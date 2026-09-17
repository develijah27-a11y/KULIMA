import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST?: string[] };

const OFFLINE_FALLBACK_CACHE = 'cropify-offline-fallback-v1';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST || [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,

  runtimeCaching: [
    // ── HTML Navigation (2G & secure proxy resilience with fallback to /offline) ──
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'cropify-pages-v2',
        networkTimeoutSeconds: 8, // Resilient 8s to accommodate secure corporate proxy inspection
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
  let payload: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    type?: string;
    actions?: { action: string; title: string; icon?: string }[];
  } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const rawTitle = payload.title ?? 'Cropify';
  const cleanTitle = rawTitle.replace(/kulima/gi, 'Cropify').replace(/agrinova/gi, 'Cropify');
  const title = cleanTitle.toLowerCase().includes('cropify')
    ? cleanTitle
    : `Cropify · ${cleanTitle}`;
  const cleanBody = (payload.body ?? '')
    .replace(/kulima/gi, 'Cropify')
    .replace(/agrinova/gi, 'Cropify');
  const rawUrl = payload.url ?? '/dashboard';

  // Always bind the target URL to the official production domain or local origin
  const origin = self.location.origin.includes('localhost')
    ? self.location.origin
    : 'https://www.cropifyapp.com';

  const fullUrl = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, origin).href;

  // Custom action buttons based on notification type so Android / Chrome NEVER shows the weird "Unsubscribe" button!
  let actions = payload.actions;
  if (!actions || actions.length === 0) {
    const combinedText = `${title} ${cleanBody} ${payload.type ?? ''}`.toLowerCase();
    if (
      combinedText.includes('delivery') ||
      combinedText.includes('job') ||
      combinedText.includes('driver') ||
      combinedText.includes('pickup') ||
      combinedText.includes('transit')
    ) {
      actions = [
        { action: 'view_job', title: '👀 View Job' },
        { action: 'open_app', title: '🚀 Open Cropify' },
      ];
    } else if (
      combinedText.includes('chat') ||
      combinedText.includes('message') ||
      combinedText.includes('group') ||
      combinedText.includes('reply')
    ) {
      actions = [
        { action: 'open_chat', title: '💬 Open Chat' },
        { action: 'open_app', title: '🚀 Open Cropify' },
      ];
    } else if (
      combinedText.includes('order') ||
      combinedText.includes('purchase') ||
      combinedText.includes('offer')
    ) {
      actions = [
        { action: 'view_order', title: '📦 View Order' },
        { action: 'open_app', title: '🚀 Open Cropify' },
      ];
    } else if (
      combinedText.includes('wallet') ||
      combinedText.includes('loan') ||
      combinedText.includes('payment') ||
      combinedText.includes('paid')
    ) {
      actions = [
        { action: 'view_wallet', title: '💰 View Details' },
        { action: 'open_app', title: '🚀 Open Cropify' },
      ];
    } else {
      actions = [
        { action: 'view', title: '👀 View' },
        { action: 'open_app', title: '🚀 Open Cropify' },
      ];
    }
  }

  const iconUrl = `${origin}/icons/icon-192.png`;
  const badgeUrl = `${origin}/icons/notification-badge-96.png`;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: cleanBody,
      icon: iconUrl,
      badge: badgeUrl,
      tag: payload.tag || `cropify-${Date.now()}`,
      data: {
        url: fullUrl,
        rawUrl,
      },
      actions,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    }),
  );
});

// Focus an already-open Cropify tab if one exists and navigate it,
// otherwise open a new one with the canonical URL.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const notifData = event.notification.data as { url?: string; rawUrl?: string } | undefined;
  const origin = self.location.origin.includes('localhost')
    ? self.location.origin
    : 'https://www.cropifyapp.com';

  const targetUrl = notifData?.url || `${origin}/dashboard`;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        if ('focus' in client) {
          await (client as WindowClient).focus();
          if ('navigate' in client) await (client as WindowClient).navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
