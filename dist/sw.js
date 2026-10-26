// Anchor service worker — generated at build time by the `anchor-pwa` plugin in vite.config.ts.
// The two placeholder tokens below are filled in with the build hash and the list of emitted files.
const CACHE = 'anchor-001f7480da6a';
const PRECACHE = [
  "./",
  "./assets/caprasimo-latin-400-normal-u3avbpQ7.woff2",
  "./assets/figtree-latin-400-normal-g7Dtegnw.woff2",
  "./assets/figtree-latin-600-normal-Cv_xCTDl.woff2",
  "./assets/figtree-latin-700-normal-th6qEP7c.woff2",
  "./assets/index-Bv8_eTRB.css",
  "./assets/index-Dp34WKES.js",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./manifest.webmanifest"
];
// The app shell is precached as the scope URL itself ('./'), so offline navigations fall back to it.
const SHELL = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('anchor-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Network first so a new deploy is picked up; the cached shell keeps the app working offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL, { ignoreSearch: true, ignoreVary: true }).then((res) => res || Response.error())),
    );
    return;
  }

  // Build assets are content-hashed, so cache-first is always correct for them. ignoreVary: hosts often
  // send `Vary: Origin`, and module scripts carry an Origin header that the precache requests did not.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => c.url.startsWith(self.registration.scope));
      return open ? open.focus() : self.clients.openWindow(self.registration.scope);
    }),
  );
});
