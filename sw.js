const VERSION = 'bio-class2-pwa-v3';
const root = new URL('./', self.location).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        cache.addAll([
          root,
          `${root}index.html`,
          `${root}manifest.webmanifest`,
        ]),
      ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('bio-class2-') && key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === `${root}class-board.json`) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        try {
          const response = await fetch(event.request, { cache: 'no-store' });
          if (!response.ok) throw new Error('Board unavailable');
          const data = await response.clone().json();
          if (
            data.schemaVersion !== 1 ||
            data.classId !== 'bio-class2' ||
            !Array.isArray(data.items)
          )
            throw new Error('Invalid board');
          await cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) {
            const headers = new Headers(cached.headers);
            headers.set('X-Board-Offline', 'true');
            return new Response(cached.body, { status: 200, headers });
          }
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })(),
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match(root)),
      ),
  );
});
