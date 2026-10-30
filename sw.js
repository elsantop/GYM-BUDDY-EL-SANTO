// Offline-Cache. Bei Änderungen an den Dateien die Versionsnummer erhöhen.
const CACHE = 'gym-buddy-v19';
const FILES = [
  './', 'index.html', 'styles.css', 'data.js', 'app.js', 'manifest.webmanifest',
  'icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'body-front.jpg', 'body-back.jpg',
  'm-back-beinbeuger.webp', 'm-back-gesaess.webp', 'm-back-hschulter.webp', 'm-back-obliques.webp', 'm-back-ruecken.webp', 'm-back-ruecken_u.webp', 'm-back-trapez.webp', 'm-back-trizeps.webp', 'm-back-unterarme.webp', 'm-back-waden.webp', 'm-front-bauch.webp', 'm-front-bizeps.webp', 'm-front-brust.webp', 'm-front-obliques.webp', 'm-front-quads.webp', 'm-front-schultern.webp', 'm-front-trapez.webp', 'm-front-unterarme.webp', 'm-front-waden.webp',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' umgeht den Browser-Cache, sonst landen nach einem Update alte Dateien im neuen Cache
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Zuerst aus dem Cache (schnell, offline im Gym), im Hintergrund aktualisieren.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request).then((hit) => {
        const net = fetch(e.request.url, { cache: 'no-cache' })
          .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});
