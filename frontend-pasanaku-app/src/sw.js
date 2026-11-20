/*
 * Service worker de Pasanaku: permite instalar la app desde el navegador y
 * guarda los archivos de la app para que abra rápido.
 * - Pantallas (navegación): primero la red; sin conexión, la última versión guardada.
 * - Archivos de la app del mismo origen (js, css, fuentes, íconos): de la caché y se actualizan.
 * - Todo lo demás (el backend GraphQL, Horizon) va directo a la red: nunca se guarda.
 */
const CACHE = 'pasanaku-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  if (/\.(js|css|woff2?|png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
  }
});
