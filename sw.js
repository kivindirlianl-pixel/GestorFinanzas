const CACHE_NAME = 'finanzas-pwa-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Buscar primero en Caché, si no hay, ir a la red (Ignorando WebSockets)
self.addEventListener('fetch', e => {
  // SOLUCIÓN: Si la petición no es HTTP o HTTPS (como las de ws:// de Live Server), la ignora
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    })
  );
});