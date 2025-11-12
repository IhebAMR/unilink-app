// Simple service worker pour Next.js (approche manuelle, utile pour POC).
// Pour production avec assets hashés, préfèrerais next-pwa/workbox.

const CACHE_NAME = 'unilink-static-v5';
const RUNTIME_CACHE = 'unilink-runtime-v5';
const API_CACHE = 'unilink-api-v5';
const PRECACHE_URLS = [
  '/', // start page
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/unilink.png',
  '/icons/unilink.png'
];

// Pages that should work offline
const OFFLINE_PAGES = [
  '/',
  '/carpools',
  '/ride-demands',
  '/login',
  '/register'
];

// API routes to cache for offline access
const CACHEABLE_API_ROUTES = [
  '/api/carpools',
  '/api/ride-demands',
  '/api/carpools/',
  '/api/ride-demands/'
];

// Install - precache basic assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Precache static assets
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.error('Failed to precache:', err);
      });
    })
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE && key !== API_CACHE)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Listen for skip waiting message
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification event listener
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Unilink',
    body: 'You have a new notification',
    icon: '/icons/unilink.png',
    badge: '/icons/unilink.png',
    tag: 'unilink-notification',
    requireInteraction: false,
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        icon: data.icon || '/icons/unilink.png',
        badge: data.badge || '/icons/unilink.png'
      };
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e);
      notificationData.body = event.data.text() || 'You have a new notification';
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if there's already a window open with this URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Helper function to check if URL is a cacheable API route
function isCacheableApiRoute(url) {
  return CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));
}

// Fetch - strategy:
// - API routes: NetworkFirst with cache fallback for offline
// - Next.js pages: CacheFirst with network update for offline navigation
// - navigation: NetworkFirst with fallback to cached pages
// - same-origin static assets: CacheFirst then network fallback
// - cross-origin: NetworkFirst with cache fallback
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (!url.protocol.startsWith('http')) return;

  // Next.js page data requests (for client-side navigation)
  // These are requests like /_next/data/[buildId]/index.json or /_next/data/[buildId]/carpools.json
  if (url.origin === self.location.origin && url.pathname.includes('/_next/data/')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(req, copy);
              console.log('[SW] Cached Next.js data:', url.pathname);
            });
          }
          return res;
        })
        .catch(() => {
          console.log('[SW] Next.js data fetch failed, checking cache');
          return caches.match(req).then(cached => {
            if (cached) {
              console.log('[SW] Serving Next.js data from cache:', url.pathname);
              return cached;
            }
            // If no cached data, return a minimal page response
            console.log('[SW] No cached data, returning minimal response');
            return new Response(JSON.stringify({ pageProps: {} }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // API routes -> NetworkFirst with cache fallback for offline access
  if (url.origin === self.location.origin && isCacheableApiRoute(url)) {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Only cache successful GET requests
          if (req.method === 'GET' && res && res.status === 200) {
            const copy = res.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(req, copy);
            });
          }
          return res;
        })
        .catch(() => {
          // When offline, try to serve from cache
          return caches.match(req).then(cached => {
            if (cached) {
              // Add a custom header to indicate this is cached data
              const headers = new Headers(cached.headers);
              headers.set('X-Cached-Response', 'true');
              return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers: headers
              });
            }
            // Return empty array if no cache available
            return new Response(JSON.stringify({ rides: [], demands: [], offline: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Navigation requests -> NetworkFirst with cache fallback, then offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Cache successful navigation responses
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              // Cache both the exact URL and the pathname
              cache.put(req, copy.clone());
              // Also cache by pathname for easier lookup
              const pathUrl = new URL(url.pathname, self.location.origin);
              cache.put(pathUrl, copy);
              console.log('[SW] Cached navigation:', url.pathname);
            });
          }
          return res;
        })
        .catch(async () => {
          console.log('[SW] Offline - trying cache for:', url.pathname);
          
          // Try to find a cached version of this page (exact match)
          const cached = await caches.match(req);
          if (cached) {
            console.log('[SW] Serving from cache (exact):', url.pathname);
            return cached;
          }

          // Try to match just the pathname (ignore query params)
          const pathname = url.pathname;
          const pathUrl = new URL(pathname, self.location.origin);
          const cachedByPath = await caches.match(pathUrl);
          if (cachedByPath) {
            console.log('[SW] Serving from cache (by path):', pathname);
            return cachedByPath;
          }

          // Try without trailing slash or with trailing slash
          const altPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname + '/';
          const altUrl = new URL(altPathname, self.location.origin);
          const cachedAlt = await caches.match(altUrl);
          if (cachedAlt) {
            console.log('[SW] Serving from cache (alt path):', altPathname);
            return cachedAlt;
          }

          // Check if it's one of our known offline-capable pages
          for (const page of OFFLINE_PAGES) {
            if (pathname === page || pathname.startsWith(page + '/')) {
              const pageUrl = new URL(page, self.location.origin);
              const cachedPage = await caches.match(pageUrl);
              if (cachedPage) {
                console.log('[SW] Serving offline-capable page:', page);
                return cachedPage;
              }
            }
          }

          // Last resort: show offline page
          console.log('[SW] No cache found, showing offline page');
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Same-origin static assets (JS, CSS, fonts, etc.) -> CacheFirst
  if (url.origin === self.location.origin) {
    // Check if it's a Next.js static resource or app page
    const isNextStatic = url.pathname.startsWith('/_next/') || 
                         url.pathname.match(/\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/);
    
    if (isNextStatic) {
      // Aggressive caching for static resources
      event.respondWith(
        caches.match(req).then(cached => {
          if (cached) {
            console.log('[SW] Serving static from cache:', url.pathname);
            return cached;
          }
          return fetch(req).then(res => {
            if (req.method === 'GET' && res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then(cache => {
                cache.put(req, copy);
                console.log('[SW] Cached static resource:', url.pathname);
              });
            }
            return res;
          }).catch(err => {
            console.log('[SW] Failed to fetch static resource:', url.pathname, err);
            if (req.destination === 'image') {
              return caches.match('/icons/unilink.png');
            }
            throw err;
          });
        })
      );
      return;
    }
    
    // Other same-origin requests
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