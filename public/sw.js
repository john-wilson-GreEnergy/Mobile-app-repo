const CACHE_NAME = 'greenergy-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API/function calls: network-first, fall back to cache
// - Static assets (JS/CSS/images): cache-first
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and cross-origin except known CDNs
  if (event.request.method !== 'GET') return;

  const isAPICall =
    url.pathname.includes('/api/') ||
    url.pathname.includes('/functions/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('base44');

  if (isAPICall) {
    // Network-first: try live, cache on success, serve cache on failure
    event.respondWith(
      fetch(event.request.clone())
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
  }
});

// Listen for sync events triggered by the app
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-surveys') {
    // Notify clients to run the sync
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'SYNC_SURVEYS' }));
    });
  }
});
