/* Kritzelkrieg – Service Worker: Netzwerk zuerst, Cache als Rückfall (offline spielbar). */
const CACHE = 'kritzelkrieg-v3';
const FILES = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/data.js', './js/content.js', './js/engine.js', './js/format.js', './js/art.js', './js/monsters.js', './js/audio.js',
  './js/cloud.js', './js/fx.js', './js/arena.js', './js/ui.js', './js/story.js', './js/loot.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !fonts) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
