/* ═══════════════════════════════════════════════════════════
   sw.js — Service Worker (PWA / Offline Support)
   Color Tube Master 3D
═══════════════════════════════════════════════════════════ */

const CACHE_NAME   = 'ctm3d-v14';
const STATIC_CACHE = 'ctm3d-static-v14';

// Files to cache for full offline play
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/tubes.css',
  '/css/ui.css',
  '/css/themes.css',
  '/css/auth.css',
  '/css/ads.css',
  '/css/ttt.css',
  '/js/firebase-config.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/levels.js',
  '/js/solver.js',
  '/js/audio.js',
  '/js/progression.js',
  '/js/animations.js',
  '/js/renderer.js',
  '/js/game.js',
  '/js/auth.js',
  '/js/leaderboard-service.js',
  '/js/auth-ui.js',
  '/js/ads.js',
  '/js/ttt.js',
  '/js/ui.js',
  '/js/main.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: cache all static assets ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Pre-caching game assets');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Message: allow page to trigger skipWaiting ────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch: serve from cache, fall back to network ─────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase/Google requests → always network (auth, Firestore, ads)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('googlesyndication')
  ) {
    return; // Let browser handle normally
  }

  // Same-origin game assets → cache first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const toCache = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, toCache);
            });
          }
          return response;
        }).catch(() => {
          // Offline fallback for navigation
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
    );
  }
});

// ── Push notifications (for daily reminders) ─────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title   = data.title   || '🧪 Color Tube Master 3D';
  const options = {
    body:    data.body    || "Today's Daily Challenge is ready! 🏆",
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data:    { url: data.url || '/' },
    actions: [
      { action: 'play',    title: '▶ Play Now' },
      { action: 'dismiss', title: 'Later' },
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
