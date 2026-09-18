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
        plugins: [new ExpirationPlugin({ maxEntries: 25, maxAgeSeconds: 3600 })],
      }),
    },
    {
      matcher: ({ url }) => (
        url.pathname.startsWith('/api/prices') ||
        url.pathname.startsWith('/api/market-prices') ||
        url.pathname.startsWith('/api/cash-crop-prices')
      ),
      handler: new StaleWhileRevalidate({
        cacheName: 'cropify-prices-v2',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 * 7 })], // 7-day snapshot cache for rural markets
      }),
    },
    {
      matcher: ({ url }) => (
        url.pathname.startsWith('/api/planting') ||
        url.pathname.startsWith('/api/diseases') ||
        url.pathname.startsWith('/api/farms')
      ),
      handler: new StaleWhileRevalidate({
        cacheName: 'cropify-agri-data-v2',
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 * 7 })],
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

// Precache offline fallback and critical farmer tools during service worker installation
const CRITICAL_OFFLINE_ROUTES = [
  '/offline',
  '/farmer/planting',
  '/farmer/prices',
  '/farmer/doctor',
  '/farmer/farm',
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(OFFLINE_FALLBACK_CACHE).then(async (cache) => {
      for (const route of CRITICAL_OFFLINE_ROUTES) {
        try {
          await cache.add(route);
        } catch (err) {
          console.warn('[sw] Could not precache route during install:', route, err);
        }
      }
    })
  );
});

// Provide cached route or /offline fallback when navigation fails completely
serwist.setCatchHandler(async ({ request }) => {
  if (request.destination === 'document' || (request as any).mode === 'navigate') {
    const offlineCache = await caches.open(OFFLINE_FALLBACK_CACHE);
    try {
      const url = new URL(request.url);
      const matched = await offlineCache.match(url.pathname);
      if (matched) return matched;
    } catch {}

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
  const cleanTitle = rawTitle
    .replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '')
    .replace(/kulima/gi, 'Cropify')
    .replace(/agrinova/gi, 'Cropify')
    .replace(/\s+/g, ' ')
    .trim();
  const title = cleanTitle.toLowerCase().includes('cropify')
    ? cleanTitle
    : `Cropify · ${cleanTitle}`;
  const cleanBody = (payload.body ?? '')
    .replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '')
    .replace(/kulima/gi, 'Cropify')
    .replace(/agrinova/gi, 'Cropify')
    .replace(/\s+/g, ' ')
    .trim();
  const rawUrl = payload.url ?? '/dashboard';

  // Always bind the target URL to the official production domain or local origin
  const origin = self.location.origin.includes('localhost')
    ? self.location.origin
    : 'https://www.cropifyapp.com';

  const fullUrl = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, origin).href;

  // Custom action buttons based on notification type without emojis
  let actions = payload.actions;
  if (actions && actions.length > 0) {
    actions = actions.map(a => ({
      ...a,
      title: (a.title || '').replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim() || a.title,
    }));
  } else {
    const textType = (payload.type ?? '').toLowerCase();
    const textUrl = fullUrl.toLowerCase();
    const textTitle = title.toLowerCase();
    const textBody = cleanBody.toLowerCase();

    // 1. Account verification & KYC documents
    if (
      textType.includes('verify') ||
      textType.includes('verification') ||
      textType.includes('kyc') ||
      textUrl.includes('/verify') ||
      textUrl.includes('/verification') ||
      textTitle.includes('verify') ||
      textTitle.includes('verification') ||
      textTitle.includes('national id') ||
      textTitle.includes('kyc') ||
      textBody.includes('national id') ||
      textBody.includes('verify your account') ||
      textBody.includes('submit your national') ||
      textBody.includes('documents to unlock')
    ) {
      actions = [
        { action: 'verify_id', title: 'Verify ID' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else if (
      textType.includes('group') ||
      textUrl.includes('/groups') ||
      textTitle.includes('group') ||
      textTitle.includes('cooperative') ||
      textBody.includes('group message') ||
      textBody.includes('group chat') ||
      textBody.includes('cooperative')
    ) {
      // 2. Farmer Groups & Co-operatives
      actions = [
        { action: 'open_group', title: 'Open Group' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else if (
      textType.includes('chat') ||
      textType.includes('message') ||
      textUrl.includes('/chat') ||
      textUrl.includes('/messages') ||
      textUrl.includes('/direct') ||
      textTitle.includes('chat') ||
      textTitle.includes('message')
    ) {
      // 3. Direct Messages & Chat
      actions = [
        { action: 'open_chat', title: 'View Message' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else if (
      textType.includes('delivery') ||
      textUrl.includes('/transporter/job') ||
      textUrl.includes('/transporter/active') ||
      textUrl.includes('/transporter/deliveries') ||
      textTitle.includes('delivery request') ||
      textTitle.includes('new delivery') ||
      textTitle.includes('pickup job') ||
      textTitle.includes('delivery assigned') ||
      textBody.includes('delivery request') ||
      textBody.includes('pickup ready') ||
      textBody.includes('cargo delivery')
    ) {
      // 4. Delivery & Transporter Jobs
      actions = [
        { action: 'view_job', title: 'View Job' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else if (
      textType.includes('order') ||
      textType.includes('offer') ||
      textUrl.includes('/orders') ||
      textUrl.includes('/order') ||
      textTitle.includes('order') ||
      textTitle.includes('purchase') ||
      textTitle.includes('offer') ||
      textBody.includes('new order') ||
      textBody.includes('order confirmed') ||
      textBody.includes('order placed')
    ) {
      // 5. Orders & Purchases
      actions = [
        { action: 'view_order', title: 'View Order' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else if (
      textType.includes('wallet') ||
      textType.includes('loan') ||
      textType.includes('payment') ||
      textType.includes('escrow') ||
      textType.includes('payout') ||
      textUrl.includes('/wallet') ||
      textTitle.includes('payment') ||
      textTitle.includes('escrow') ||
      textTitle.includes('wallet') ||
      textTitle.includes('payout') ||
      textBody.includes('payment received') ||
      textBody.includes('escrow released')
    ) {
      // 6. Payments & Wallet
      actions = [
        { action: 'view_wallet', title: 'View Wallet' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else if (
      textType.includes('pest') ||
      textType.includes('disease') ||
      textType.includes('diagnosis') ||
      textUrl.includes('/pathologist') ||
      textTitle.includes('pest') ||
      textTitle.includes('disease') ||
      textTitle.includes('diagnosis')
    ) {
      // 7. Pest & Diagnosis
      actions = [
        { action: 'view_diagnosis', title: 'View Diagnosis' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else if (
      textType.includes('weather') ||
      textType.includes('planting') ||
      textType.includes('season') ||
      textType.includes('price') ||
      textUrl.includes('/weather') ||
      textUrl.includes('/planting') ||
      textUrl.includes('/prices') ||
      textTitle.includes('weather') ||
      textTitle.includes('rain') ||
      textTitle.includes('planting')
    ) {
      // 8. Alerts
      actions = [
        { action: 'view_alert', title: 'View Alert' },
        { action: 'open_app', title: 'Open App' },
      ];
    } else {
      // 9. Default Fallback
      actions = [
        { action: 'view_details', title: 'View Details' },
        { action: 'open_app', title: 'Open App' },
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

  // If user clicked "Open App", take them directly to the app dashboard;
  // otherwise navigate to the specific action/page destination URL.
  let targetUrl = notifData?.url || `${origin}/dashboard`;
  if (event.action === 'open_app') {
    targetUrl = `${origin}/dashboard`;
  }

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
