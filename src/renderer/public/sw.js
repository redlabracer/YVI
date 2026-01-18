// Service Worker für KFZ Werkstatt PWA
// Version: 3.0.0 - Vereinfacht und stabil
const CACHE_VERSION = 'v3';
const CACHE_NAME = `kfz-werkstatt-${CACHE_VERSION}`;

// Assets die beim Install gecacht werden
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] Install failed:', err))
  );
});

// Aktivierung - alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch Handler - Network First mit Cache Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Nur GET Anfragen cachen
  if (request.method !== 'GET') {
    return;
  }

  // Ignoriere chrome-extension, ws, etc.
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Versuche Netzwerk zuerst
    const networkResponse = await fetch(request);
    
    // Nur erfolgreiche Responses cachen
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      // Clone vor dem Cachen
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Netzwerk fehlgeschlagen - versuche Cache
    console.log('[SW] Network failed, trying cache for:', url.pathname);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Für Navigation: Zeige gecachte index.html
    if (request.mode === 'navigate') {
      const indexResponse = await caches.match('/');
      if (indexResponse) {
        return indexResponse;
      }
    }
    
    // Keine Cache-Antwort verfügbar
    return new Response('Offline - Keine Verbindung', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Message Handler
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});

console.log('[SW] Service Worker v3 loaded');
