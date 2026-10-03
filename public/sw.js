// toko-online.online - PWA Service Worker (v5 Firefox & Cross-Browser Compliant)
const CACHE_NAME = 'toko-online-cache-v5';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip chrome-extension / external schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Never cache API calls, Supabase endpoints, or socket connections
  if (
    event.request.url.includes('/api/') || 
    event.request.url.includes('/rest/v1/') || 
    event.request.url.includes('/socket.io/')
  ) {
    return;
  }

  const isHtml = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');

  if (isHtml) {
    // Network-first for HTML pages (Firefox-compliant: no { cache: 'no-cache' } on navigate Request)
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = (await caches.match(event.request)) || 
                         (await caches.match('/')) || 
                         (await caches.match('/index.html'));
          if (cached) {
            return cached;
          }
          // Never resolve undefined to event.respondWith in Firefox!
          return new Response(
            '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>toko-online.online - Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:40px 20px;text-align:center;background:#F8F9FA;color:#1F2937}h1{color:#E51A24;font-size:24px;margin-bottom:12px}p{font-size:14px;color:#4B5563;max-width:400px;margin:0 auto 24px}button{background:#E51A24;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px}</style></head><body><h1>toko-online.online</h1><p>Halaman sedang offline atau koneksi internet terputus. Silakan periksa jaringan Anda lalu coba lagi.</p><button onclick="window.location.reload()">Muat Ulang Halaman</button></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        })
    );
    return;
  }

  // Assets (JS, CSS, Images, Icons)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for missing offline image
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#E5E7EB"/><text x="50" y="55" font-family="sans-serif" font-size="12" fill="#9CA3AF" text-anchor="middle">Gambar</text></svg>',
            {
              status: 200,
              headers: { 'Content-Type': 'image/svg+xml' },
            }
          );
        }
        // Always return a valid Response instead of undefined to prevent Firefox fatal TypeError
        return new Response('Asset not available offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

// PWA Push Notification Event Listener
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'toko-online.online Promo Spesial! 🎉',
    body: 'Ada diskon dan promo menarik baru saja hadir di toko-online.online!',
    url: '/',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    }
  } catch (err) {
    if (event.data) {
      notificationData.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || '/pwa-192x192.png',
    badge: notificationData.badge || '/pwa-192x192.png',
    image: notificationData.image,
    vibrate: [200, 100, 200, 100, 250],
    tag: notificationData.tag || 'toko-online-promo',
    renotify: true,
    data: {
      url: notificationData.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_app', title: '🛍️ Buka Promo' },
      { action: 'dismiss', title: 'Tutup' }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// PWA Notification Click Event Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
