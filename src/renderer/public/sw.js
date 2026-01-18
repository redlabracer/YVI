// Service Worker für KFZ Werkstatt PWA
const CACHE_NAME = 'kfz-werkstatt-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Statische Assets zum Cachen
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Installation - Cache statische Assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Aktivierung - Alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Netzwerk-Proxy mit Cache-Strategien
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests except for upload (handled by background sync)
  if (request.method !== 'GET') {
    return;
  }

  // API-Aufrufe: Network-first mit Cache-Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Statische Assets: Cache-first
  event.respondWith(cacheFirst(request));
});

// Cache-first Strategie
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Fetch failed, returning offline page');
    return new Response('Offline - Keine Verbindung', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Network-first Strategie
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background Sync für Offline-Uploads
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync triggered:', event.tag);
  
  if (event.tag === 'upload-photos') {
    event.waitUntil(syncPhotos());
  }
});

// Fotos synchronisieren
async function syncPhotos() {
  console.log('[SW] Syncing photos...');
  
  try {
    const db = await openDB();
    const photos = await getAllPendingPhotos(db);
    
    console.log('[SW] Found pending photos:', photos.length);
    
    for (const photo of photos) {
      try {
        const formData = new FormData();
        formData.append('photo', photo.blob, photo.filename);
        
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          // Erfolgreich - aus IndexedDB löschen
          await deletePhoto(db, photo.id);
          console.log('[SW] Photo synced and deleted:', photo.id);
          
          // Benachrichtigung senden
          await showNotification('Upload erfolgreich', {
            body: `${photo.filename} wurde hochgeladen`,
            icon: '/icons/icon-192.png',
            tag: 'upload-success'
          });
        }
      } catch (error) {
        console.error('[SW] Failed to sync photo:', photo.id, error);
      }
    }
    
    // Alle Clients über Sync-Status informieren
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        count: photos.length
      });
    });
    
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Retry später
  }
}

// IndexedDB öffnen
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KFZWerkstattDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingPhotos')) {
        db.createObjectStore('pendingPhotos', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Alle ausstehenden Fotos abrufen
function getAllPendingPhotos(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingPhotos', 'readonly');
    const store = transaction.objectStore('pendingPhotos');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Foto aus IndexedDB löschen
function deletePhoto(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingPhotos', 'readwrite');
    const store = transaction.objectStore('pendingPhotos');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Benachrichtigung anzeigen
async function showNotification(title, options) {
  if (self.Notification && Notification.permission === 'granted') {
    return self.registration.showNotification(title, options);
  }
}

// Push-Benachrichtigungen
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'KFZ Werkstatt', {
      body: data.body || 'Neue Nachricht',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'default'
    })
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

console.log('[SW] Service Worker loaded');
