// Intentionally does no caching — present only to satisfy PWA installability
// while the app is under active development. Do not add caches.open/put here.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// No 'fetch' listener: every request falls through to normal network handling.
