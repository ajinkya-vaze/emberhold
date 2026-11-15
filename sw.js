// Offline support. Strategy: network first (so updates arrive as soon as you're online),
// falling back to the cached copy when offline or when the network is too slow.
// Bump VERSION when the file list changes; tools/check_sw.py verifies the list.
const VERSION = 'emberhold-v2';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/art.js',
  './src/audio.js',
  './src/data/stages.js',
  './src/data/units.js',
  './src/main.js',
  './src/progress.js',
  './src/save.js',
  './src/scenes/battle.js',
  './src/scenes/campaign.js',
  './src/scenes/menu.js',
  './src/ui.js',
  './src/util.js',
  './src/view.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await Promise.race([fetch(req), timeout(4000)]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
