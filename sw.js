// Service Worker per Gestione Vendite PWA
const CACHE_NAME = 'gestione-vendite-cache-v2';
const ASSETS_TO_CACHE = [
  './', './index.html', './manifest.json', './icon-192.png',
  './icon-512.png', './apple-touch-icon.png', './favicon.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
    return cache.addAll(ASSETS_TO_CACHE).catch((err) => console.warn('[SW] Errore pre-caching:', err));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keyList) => {
    return Promise.all(keyList.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => { cache.put(event.request, responseToCache); });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
