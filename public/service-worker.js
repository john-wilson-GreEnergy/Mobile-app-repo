/**
 * Service Worker — Offline caching and background sync
 * Enables offline access to cached resources and syncs data when connection restored
 */

const CACHE_VERSION = 'greenergy-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.jsx',
];

// Install event — cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[ServiceWorker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Fail silently if assets aren't available yet
        console.warn('[ServiceWorker] Some assets failed to cache');
      });
    })
  );
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event — cache-first strategy for images/static, network-first for APIs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip requests to external services and service worker itself
  if (url.hostname !== self.location.hostname) return;

  // Cache-first for static assets (js, css, images)
  if (/\.(js|css|woff2?|png|jpg|jpeg|gif|svg|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Network-first for API calls with fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        // Cache successful API responses
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        // Return cached response if network fails
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Return offline page if available
          return new Response('Offline - cached data available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

// Background sync for pending survey submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(
      // Notify clients to sync pending submissions
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_SUBMISSIONS',
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
