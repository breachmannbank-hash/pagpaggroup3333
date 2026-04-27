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
// If network fails (offline), use cached version or fallback to index.html for navigation.
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedFile => {
      if (cachedFile) {
        return cachedFile;
      }
      
      return fetch(event.request)
        .then(response => {
          // Cache successful network responses for future offline use
          if (response && response.status === 200 && response.type !== 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network request failed. For navigation requests (HTML pages),
          // return the cached index.html so the app can load with saved data
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // For other requests, return a placeholder response
          return new Response('Offline - resource not cached', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});
