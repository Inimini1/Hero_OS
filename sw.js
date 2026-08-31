// Hero OS service worker — app-shell caching for offline/installable use.
// Bump CACHE_NAME whenever any precached file changes so clients update cleanly.
const CACHE_NAME = 'hero-os-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/utils.js',
  './js/store.js',
  './js/state.js',
  './js/toast.js',
  './js/services/ai.js',
  './js/services/hardware.js',
  './js/services/nfc.js',
  './js/services/google.js',
  './js/keyboard.js',
  './js/commandPalette.js',
  './js/views/dashboard.js',
  './js/views/missions.js',
  './js/views/focus.js',
  './js/views/modes.js',
  './js/views/suitcheck.js',
  './js/views/capture.js',
  './js/views/briefing.js',
  './js/views/connections.js',
  './js/views/jarvis.js',
  './js/views/nfcManager.js',
  './js/views/portal.js',
  './js/views/detective.js',
  './js/views/settings.js',
  './js/pwa.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Everything else (cross-origin calls,
  // any future backend/API traffic, POST/PUT/etc.) passes straight to the network
  // and is never touched by this service worker.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || caches.match('./index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((fresh) => {
      cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || networkPromise;
}
