// Service worker to unregister any existing service workers
// This ensures assets are served correctly from Next.js static directory

self.addEventListener('install', (event) => {
  // Force activation immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Claim all clients immediately
      self.clients.claim(),
      // Clear all caches first
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        // Unregister this service worker after clearing caches
        return self.registration.unregister();
      }),
    ])
  );
});

// No fetch handler - let all requests pass through normally
// This avoids the "no-op fetch handler" warning

