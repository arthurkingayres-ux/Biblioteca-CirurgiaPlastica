const CACHE_NAME = 'briefing-preop-v26';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=2026-04-18-anat-opener',
  './theme.js?v=2026-04-18-anat-opener',
  './app.js?v=2026-04-18-anat-opener',
  './search.js?v=2026-04-18-anat-opener',
  './renderer.js?v=2026-04-18-anat-opener',
  './preop.js?v=2026-04-18-anat-opener',
  './chat.js?v=2026-04-18-anat-opener',
  './icons/lucide.js?v=2026-04-18-anat-opener',
  './fonts/Fraunces-VariableFont.woff2',
  './fonts/InstrumentSans-VariableFont.woff2',
  './fonts/InstrumentSans-Italic-VariableFont.woff2',
  './fonts/JetBrainsMono-VariableFont.woff2',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-only for chat API calls (never cache)
  if (e.request.url.includes('workers.dev/chat')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && (e.request.url.includes('/content/') || e.request.url.includes('/assets/'))) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});
