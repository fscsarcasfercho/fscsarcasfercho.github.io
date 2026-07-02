// ===== DINAMI DPS - Service Worker =====
// Permite que la PWA funcione offline y se instale en el dispositivo.

const CACHE_NAME = 'dinami-dps-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './icon.svg',
  './manifest.json'
];

// ===== INSTALACIÓN =====
// Pre-cachea los archivos esenciales de la app.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        self.skipWaiting();
      })
      .catch((err) => {
        console.warn('SW: Error al cachear assets:', err);
      })
  );
});

// ===== ACTIVACIÓN =====
// Limpia cachés antiguos cuando se actualiza el SW.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// ===== FETCH =====
// Estrategia: Network First con fallback a cache.
// Si la red falla, sirve desde cache (offline).
self.addEventListener('fetch', (event) => {
  // Solo intercepta peticiones GET
  if (event.request.method !== 'GET') return;

  // No interceptar peticiones a URLs externas (CDNs, APIs, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la respuesta para guardarla en cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Sin red: intenta servir desde cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Si no está en cache y es una navegación, sirve index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // Respuesta vacía para otros recursos no cacheados
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
  );
});