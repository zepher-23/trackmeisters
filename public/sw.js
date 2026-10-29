// Trackmeisters PWA Service Worker
const CACHE_NAME = 'trackmeisters-pwa-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Network-first fetch handler to ensure fresh live data and event updates
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) return;
    
    // Bypass non-GET requests (e.g. POST, Cloudinary uploads, Firestore)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

