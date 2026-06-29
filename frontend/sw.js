const CACHE_NAME = 'wc-2026-predict-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './db.js',
  './app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://storage.livescore.com/images/competition/high/world-cup-ls-logo.png'
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Service Worker (Clean up old caches)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Fetch events (Cache first, then network)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).catch(() => {
        // Fallback for API or page fetches if offline
        console.log('Fetch failed, user is offline');
      });
    })
  );
});
