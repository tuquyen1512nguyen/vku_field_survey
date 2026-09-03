// Service Worker: VKU Field Survey — Offline-First Architecture
// Chiến lược: Cache-First cho App Shell (HTML, CSS, JS, Icons) đảm bảo khởi động < 1s

const CACHE_NAME = 'vku-survey-cache-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/db.js',
  './js/form-wizard.js',
  './js/sync-manager.js',
  './js/native-bridge.js',
  './js/ui.js',
  './js/report-generator.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

// 1. Install Event: Nạp trước (Pre-cache) App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Đang cài đặt Service Worker phiên bản:', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Đang lưu trữ trước App Shell vào Cache Storage...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cảnh báo khi pre-cache các tệp tĩnh:', err);
      });
    })
  );
});

// 2. Activate Event: Dọn dẹp cache cũ và kích hoạt ngay
self.addEventListener('activate', (event) => {
  console.log('[SW] Đang kích hoạt Service Worker mới...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Xóa bộ nhớ cache cũ:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Chiến lược Cache-First cho App Shell, Network-First cho dữ liệu động
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Xử lý mock API /api/surveys/sync
  if (url.pathname.includes('/api/surveys/sync')) {
    event.respondWith(
      handleApiSync(request)
    );
    return;
  }

  // Bỏ qua các giao thức không phải http/https (như chrome-extension:)
  if (!url.protocol.startsWith('http')) return;

  // Chiến lược Cache-First cho tài nguyên tĩnh
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Trả về ngay từ Cache (khởi động dưới 1 giây)
        // Đồng thời cập nhật ngầm nếu có mạng (Stale-While-Revalidate nhẹ)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {
          // Bỏ qua lỗi ngầm khi ngoại tuyến
        });
        return cachedResponse;
      }

      // Nếu chưa có trong Cache, tải từ mạng và ghi vào cache
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Xử lý ngoại tuyến: Nếu là yêu cầu trang HTML, trả về index.html từ cache
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Xử lý API đồng bộ giả lập (Mock Backend) nếu chạy standalone không có backend thực
async function handleApiSync(request) {
  try {
    const payload = await request.json();
    console.log('[SW Mock Server] Nhận yêu cầu đồng bộ ngoại tuyến:', payload);

    // Giả lập xử lý máy chủ backend với độ trễ 400ms
    await new Promise((res) => setTimeout(res, 400));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Đồng bộ dữ liệu khảo sát VKU lên máy chủ trường thành công',
        syncedAt: new Date().toISOString(),
        surveyId: payload.id || 'N/A'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 4. Background Sync API (Khi mạng được khôi phục trong nền)
self.addEventListener('sync', (event) => {
  console.log('[SW] Nhận sự kiện Background Sync với thẻ:', event.tag);
  if (event.tag === 'vku-sync-surveys') {
    event.waitUntil(
      notifyClientsToSync()
    );
  }
});

// Thông báo cho tất cả các tab khách hàng kích hoạt quy trình đồng bộ
async function notifyClientsToSync() {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({
      type: 'TRIGGER_BACKGROUND_SYNC',
      timestamp: Date.now()
    });
  }
}
