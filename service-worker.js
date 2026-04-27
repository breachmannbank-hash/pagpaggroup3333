const CACHE_NAME = "text-to-reviewer-v9";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./service-worker.js"
];

// Save the app files in the browser cache during installation.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
});

// Remove old cache versions if the app is updated later.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});

// Use the cache first, then try the network if a file is not cached.
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedFile => {
      return cachedFile || fetch(event.request);
    })
  );
});
