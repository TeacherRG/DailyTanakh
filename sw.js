// DailyTanakh service worker — offline-first.
const CACHE = 'dailytanakh-v8';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './src/main.js',
  './src/styles/fonts.css', './src/styles/base.css', './src/styles/components.css', './src/styles/print.css',
  './vendor/preact.module.js', './vendor/hooks.module.js',
  './vendor/signals-core.module.js', './vendor/signals.module.js', './vendor/htm.module.js',
  './src/lib/html.js', './src/lib/storage.js', './src/lib/icons.js', './src/lib/i18n.js',
  './src/lib/store.js', './src/lib/router.js', './src/lib/data.js', './src/lib/schedule.js',
  './src/lib/notify.js', './src/lib/print.js', './src/lib/util.js', './src/lib/reminders.js',
  './src/i18n/ru.js', './src/i18n/en.js', './src/i18n/de.js', './src/i18n/he.js',
  './src/components/ui.js', './src/components/chrome.js',
  './src/views/home.js', './src/views/reader.js', './src/views/library.js',
  './src/views/cycle.js', './src/views/profile.js', './src/views/settings.js', './src/views/about.js',
  './data/books.json',
  './data/kids.json',
  './src/lib/kids.js',
  './src/views/kids.js',
  './src/views/mode.js',
  './src/styles/kids.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u =>
        fetch(u, { cache: 'no-cache' }).then(r => (r && r.ok) ? c.put(u, r) : null).catch(() => null))))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }

  const isData = url.pathname.includes('/data/') || url.pathname.includes('/assets/');
  if (isData) {
    // data & fonts: cache-first (large, versioned by CACHE name)
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached))
    );
    return;
  }
  // app shell (js/css/html): stale-while-revalidate — instant offline, self-updating
  e.respondWith(
    caches.match(req).then(cached => {
      const refresh = fetch(new Request(req, { cache: 'no-cache' })).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || refresh;
    })
  );
});
