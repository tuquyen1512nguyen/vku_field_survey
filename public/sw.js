// VKU Field Mission Service Worker — Cache-First Offline Engine
const CACHE_NAME = 'vku-mission-cache-v2.0.0';

const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Install: Pre-cache App Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching App Shell...');
      return cache.addAll(PRECACHE_RESOURCES);
    })
  );
});

// Activate: Dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Chiến lược Cache-First cho App Shell & Assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Xử lý mock API /api/surveys/sync
  if (url.pathname.includes('/api/surveys/sync')) {
    event.respondWith(
      new Response(
        JSON.stringify({
          success: true,
          message: 'Đồng bộ máy chủ VKU hoàn tất (SW Mock Endpoint)',
          timestamp: new Date().toISOString()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    );
    return;
  }

  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Tải ngầm cập nhật nếu có mạng
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then((c) => c.put(req, res));
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(req).then((networkRes) => {
        if (!networkRes || networkRes.status !== 200) return networkRes;
        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, resClone));
        return networkRes;
      }).catch(() => {
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
