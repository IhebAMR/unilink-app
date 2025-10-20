// Simple service worker pour Next.js (approche manuelle, utile pour POC).
// Pour production avec assets hashés, préfèrerais next-pwa/workbox.

const CACHE_NAME = 'unilink-static-v1';
const RUNTIME_CACHE = 'unilink-runtime-v1';
const PRECACHE_URLS = [
  '/', // start page
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/unilink.png',
  '/icons/unilink.png'
];

// Install - precache basic assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch - strategy:
// - navigation: NetworkFirst with fallback to offline.html
// - same-origin static assets: CacheFirst then network fallback
// - cross-origin: NetworkFirst with cache fallback
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (!url.protocol.startsWith('http')) return;

  // Navigation requests -> NetworkFirst
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Same-origin static assets -> CacheFirst
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req)
          .then(res => {
            if (req.method === 'GET' && res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => {
            if (req.destination === 'image') {
              return caches.match('/icons/unilink.png');
            }
          });
      })
    );
    return;
  }

  // Cross-origin -> NetworkFirst with fallback to cache
  event.respondWith(
    fetch(req)
      .then(res => res)
      .catch(() => caches.match(req))
  );
});