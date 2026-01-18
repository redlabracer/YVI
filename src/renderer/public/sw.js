// Service Worker für KFZ Werkstatt PWA
// Version: 2.0.0 - Vollständige App-Unterstützung
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Statische Assets die beim Install gecacht werden
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// API-Endpoints die gecacht werden sollen
const CACHEABLE_API_ROUTES = [
  '/api/customers',
  '/api/vehicles',
  '/api/appointments',
  '/api/templates',
  '/api/settings'
];

// Installation - Cache statische Assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
  // Sofort aktivieren ohne auf andere Tabs zu warten
  self.skipWaiting();
});

// Aktivierung - Alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            // Lösche alle Caches die nicht zur aktuellen Version gehören
            return key.startsWith('static-') || key.startsWith('dynamic-') || key.startsWith('api-');
          })
          .filter((key) => {
            return key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE;
          })
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  // Übernehme sofort die Kontrolle über alle Clients
  self.clients.claim();
});

// Fetch - Netzwerk-Proxy mit intelligenten Cache-Strategien
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignoriere nicht-HTTP(S) Anfragen
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Ignoriere POST, PUT, DELETE etc. (außer für Background Sync)
  if (request.method !== 'GET') {
    return;
  }

  // API-Aufrufe: Network-first mit Cache-Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Statische Assets (JS, CSS, Bilder): Cache-first mit Network-Fallback
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // HTML Navigation: Network-first für frische Inhalte
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
    return;
  }

  // Alles andere: Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Prüft ob es sich um ein statisches Asset handelt
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.ico'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Cache-first Strategie - gut für statische Assets
async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Asset aus Cache, aber im Hintergrund aktualisieren
    updateCacheInBackground(request, cacheName);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for:', request.url);
    return createOfflineResponse(request);
  }
}

// Network-first Strategie - gut für API und dynamische Inhalte
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return createOfflineResponse(request);
  }
}

// Stale-while-revalidate - zeigt gecachte Version, aktualisiert im Hintergrund
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      caches.open(cacheName).then((cache) => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => null);
  
  return cachedResponse || fetchPromise || createOfflineResponse(request);
}

// Aktualisiert Cache im Hintergrund
function updateCacheInBackground(request, cacheName) {
  fetch(request).then((response) => {
    if (response.ok) {
      caches.open(cacheName).then((cache) => {
        cache.put(request, response);
      });
    }
  }).catch(() => {
    // Ignoriere Fehler bei Hintergrund-Updates
  });
}

// Erstellt eine Offline-Response
function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Für API-Anfragen: JSON-Fehler
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Keine Internetverbindung. Daten werden angezeigt sobald Sie wieder online sind.',
        offline: true 
      }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
  
  // Für HTML-Seiten: Offline-Seite
  if (request.mode === 'navigate') {
    return caches.match('/index.html').then((response) => {
      return response || new Response(
        `<!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - KFZ Werkstatt</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                   display: flex; align-items: center; justify-content: center; 
                   min-height: 100vh; margin: 0; background: #f0f2f5; text-align: center; padding: 20px; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; }
            h1 { color: #1f2937; margin-top: 0; }
            p { color: #6b7280; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            button { background: #2563eb; color: white; border: none; padding: 12px 24px; 
                     border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: 1rem; }
            button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">📴</div>
            <h1>Keine Verbindung</h1>
            <p>Sie sind offline. Bitte überprüfen Sie Ihre Internetverbindung.</p>
            <button onclick="location.reload()">Erneut versuchen</button>
          </div>
        </body>
        </html>`,
        { 
          status: 503, 
          headers: { 'Content-Type': 'text/html; charset=utf-8' } 
        }
      );
    });
  }
  
  // Für andere Anfragen
  return new Response('Offline', { status: 503 });
}

// Background Sync für Offline-Daten
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync triggered:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData());
  }
});

// Synchronisiert ausstehende Daten
async function syncPendingData() {
  try {
    const db = await openDB();
    const pendingItems = await getAllPending(db);
    
    console.log('[SW] Syncing pending items:', pendingItems.length);
    
    for (const item of pendingItems) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        
        if (response.ok) {
          await deletePendingItem(db, item.id);
          console.log('[SW] Synced and deleted:', item.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync item:', item.id, error);
      }
    }
    
    // Benachrichtige alle Clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        count: pendingItems.length
      });
    });
    
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

// IndexedDB Funktionen
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KFZWerkstattOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingRequests', 'readonly');
    const store = transaction.objectStore('pendingRequests');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePendingItem(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingRequests', 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push-Benachrichtigungen
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'Neue Benachrichtigung',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: data.tag || 'default',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'KFZ Werkstatt', options)
  );
});

// Notification Click - Öffnet die App
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Wenn App bereits offen, fokussiere sie
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Sonst öffne neues Fenster
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message Handler für Kommunikation mit der App
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
    );
  }
});

console.log('[SW] KFZ Werkstatt Service Worker v2 loaded');
