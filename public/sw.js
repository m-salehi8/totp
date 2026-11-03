/**
 * Kelidban TOTP Authenticator Service Worker
 * Strict Cache-First strategy for 100% offline capability (Airplane Mode)
 */

const CACHE_NAME = 'kelidban-offline-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/icon.svg',
  '/icon-maskable.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
];

// Install Event: Pre-cache app shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pre-cache known assets
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[SW] Pre-caching warning:', err);
      }
      return self.skipWaiting();
    })
  );
});

// Activate Event: Claim clients immediately and clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Strict Cache-First Strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip browser extensions and chrome-extension schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Return from cache immediately if found (Cache-First)
      if (cachedResponse) {
        // Asynchronously update cache in the background if online
        if (navigator.onLine) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
            })
            .catch(() => {
              // Ignore background fetch failure in offline mode
            });
        }
        return cachedResponse;
      }

      // 2. Fall back to network if not in cache
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Cache the newly fetched asset
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(async () => {
          // 3. Fallback for navigation requests when offline
          if (event.request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            const fallback = await cache.match('/index.html') || await cache.match('/');
            if (fallback) {
              return fallback;
            }
          }
          return new Response('Offline - Kelidban Authenticator', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
          });
        });
    })
  );
});
