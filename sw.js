const CACHE_NAME = "workbench-cache-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./qr-generator.js",
  "./js/constants.js",
  "./js/storage.js",
  "./js/auth.js",
  "./js/ideas.js",
  "./js/projects.js",
  "./js/skills.js",
  "./js/tools.js",
  "./js/studios.js",
  "./js/advanced-suites.js",
  "./app.js",
  "./manifest.json",
  "./favicon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Only handle same-origin static requests, never cloud or external API requests
  if (url.origin !== self.location.origin) return;

  // Network-first for code and markup so refreshes always fetch the latest updates immediately
  const isCodeOrDoc = url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname === "/" || url.pathname.endsWith("/");
  if (isCodeOrDoc) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for other static media and assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => null);
      return cached || fetchPromise;
    })
  );
});
