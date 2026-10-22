// Offline-Cache. Bei Änderungen an den Dateien die Versionsnummer erhöhen.
const CACHE = 'gym-buddy-v7';
const FILES = [
  './', 'index.html', 'styles.css', 'data.js', 'app.js', 'manifest.webmanifest',
  'icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
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
        const net = fetch(e.request)
          .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});
