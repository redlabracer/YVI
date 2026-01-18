import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { networkInterfaces } from 'os'
import { join, extname } from 'path'
import { app, BrowserWindow } from 'electron'
import { Server } from 'http'
import { promises as fs } from 'fs'
import localtunnel from 'localtunnel'
import axios from 'axios'
import { logger } from './logger'

let server: Server | null = null
let tunnel: localtunnel.Tunnel | null = null
const PORT = 3456 // Fixed port or dynamic

export const startMobileServer = async (mainWindow: BrowserWindow): Promise<{ url: string, publicIp?: string }> => {
  if (server) {
    await stopMobileServer()
  }

  const expressApp = express()
  expressApp.use(cors())
  // Important: Trust proxy for localtunnel
  expressApp.set('trust proxy', 1) 

  // Configure storage
  const storage = multer.diskStorage({
    destination: async function (_req, _file, cb) {
      const uploadDir = join(app.getPath('userData'), 'mobile-uploads')
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    },
    filename: function (_req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname))
    }
  })

  const upload = multer({ storage: storage })

  // Serve PWA manifest
  expressApp.get('/manifest.json', (_req, res) => {
    res.json({
      name: 'KFZ Werkstatt',
      short_name: 'Werkstatt',
      description: 'KFZ Werkstatt Management - Mobile App',
      start_url: '/',
      display: 'standalone',
      background_color: '#f0f2f5',
      theme_color: '#2563eb',
      orientation: 'portrait-primary',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    })
  })

  // Serve placeholder icons as SVG
  expressApp.get('/icons/icon-192.png', (_req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(\`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
      <rect width="192" height="192" rx="24" fill="#2563eb"/>
      <circle cx="96" cy="80" r="35" fill="white"/>
      <path d="M96 120c-30 0-55 15-55 35v12h110v-12c0-20-25-35-55-35z" fill="white"/>
      <text x="96" y="180" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">KFZ</text>
    </svg>\`)
  })

  expressApp.get('/icons/icon-512.png', (_req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(\`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="64" fill="#2563eb"/>
      <circle cx="256" cy="200" r="90" fill="white"/>
      <path d="M256 320c-80 0-145 40-145 90v32h290v-32c0-50-65-90-145-90z" fill="white"/>
      <text x="256" y="480" text-anchor="middle" fill="white" font-family="Arial" font-size="42" font-weight="bold">KFZ</text>
    </svg>\`)
  })

  // Serve Service Worker
  expressApp.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript')
    res.send(\`
// Service Worker für KFZ Werkstatt PWA
const CACHE_NAME = 'kfz-werkstatt-v1';
const STATIC_ASSETS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Aktivierung
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Fetch - Cache-first für statische Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});

// Background Sync für Uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-photos') {
    event.waitUntil(syncPhotos());
  }
});

async function syncPhotos() {
  const db = await openDB();
  const photos = await getAllPhotos(db);
  
  for (const photo of photos) {
    try {
      const formData = new FormData();
      formData.append('photo', photo.blob, photo.filename);
      
      const response = await fetch('/upload', { method: 'POST', body: formData });
      
      if (response.ok) {
        await deletePhoto(db, photo.id);
        await self.registration.showNotification('Upload erfolgreich', {
          body: photo.filename + ' wurde hochgeladen und gelöscht',
          icon: '/icons/icon-192.png'
        });
      }
    } catch (e) { console.error('Sync failed:', e); }
  }
  
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE', count: photos.length }));
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('KFZWerkstattDB', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains('pendingPhotos')) {
        e.target.result.createObjectStore('pendingPhotos', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllPhotos(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('pendingPhotos', 'readonly').objectStore('pendingPhotos').getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function deletePhoto(db, id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('pendingPhotos', 'readwrite').objectStore('pendingPhotos').delete(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}
    \`)
  })

  // Serve upload page with PWA support
  expressApp.get('/', (_req, res) => {
    res.send(\`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="theme-color" content="#2563eb">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="KFZ Werkstatt">
        <link rel="manifest" href="/manifest.json">
        <link rel="apple-touch-icon" href="/icons/icon-192.png">
        <title>KFZ Werkstatt</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            display: flex; flex-direction: column; align-items: center; justify-content: center; 
            min-height: 100vh; margin: 0; background: #f0f2f5; padding: 1rem;
          }
          .card { 
            background: white; padding: 2rem; border-radius: 1rem; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; 
            width: 100%; max-width: 400px; 
          }
          h1 { margin-top: 0; color: #1a1a1a; font-size: 1.5rem; }
          p { color: #666; margin-bottom: 1.5rem; font-size: 0.95rem; }
          .upload-btn { 
            background: #2563eb; color: white; padding: 1rem 1.5rem; 
            border-radius: 0.75rem; font-size: 1.1rem; font-weight: 600; 
            cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            width: 100%; text-decoration: none; border: none; margin-bottom: 0.75rem;
            transition: transform 0.1s, background 0.2s;
          }
          .upload-btn:active { transform: scale(0.98); }
          .upload-btn.secondary { background: #4b5563; }
          .upload-btn.success { background: #059669; }
          .upload-btn:disabled { background: #9ca3af; cursor: not-allowed; }
          input[type="file"] { display: none; }
          .hidden { display: none !important; }
          .spinner { 
            border: 4px solid #e5e7eb; border-top: 4px solid #2563eb; 
            border-radius: 50%; width: 40px; height: 40px; 
            animation: spin 1s linear infinite; margin: 1.5rem auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          
          .status-bar {
            background: #fef3c7; border: 1px solid #f59e0b; border-radius: 0.5rem;
            padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.9rem;
            display: flex; align-items: center; gap: 0.5rem;
          }
          .status-bar.offline { background: #fee2e2; border-color: #ef4444; }
          .status-bar.syncing { background: #dbeafe; border-color: #3b82f6; }
          .status-bar.success { background: #d1fae5; border-color: #10b981; }
          
          .pending-list {
            background: #f9fafb; border-radius: 0.5rem; padding: 1rem;
            margin-top: 1rem; text-align: left;
          }
          .pending-item {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;
            font-size: 0.9rem;
          }
          .pending-item:last-child { border-bottom: none; }
          .pending-count {
            background: #ef4444; color: white; border-radius: 50%;
            width: 24px; height: 24px; display: flex; align-items: center; 
            justify-content: center; font-size: 0.8rem; font-weight: bold;
          }
          
          .check-icon { width: 64px; height: 64px; color: #059669; margin-bottom: 1rem; }
          
          .install-prompt {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white; padding: 1rem; border-radius: 0.75rem;
            margin-bottom: 1rem; cursor: pointer;
            display: flex; align-items: center; gap: 0.75rem;
          }
          .install-prompt .icon { font-size: 1.5rem; }
          .install-prompt .text { text-align: left; }
          .install-prompt .text strong { display: block; margin-bottom: 0.25rem; }
          .install-prompt .text small { opacity: 0.9; }
        </style>
      </head>
      <body>
        <!-- Install Prompt -->
        <div class="install-prompt hidden" id="installPrompt" onclick="installApp()">
          <span class="icon">📲</span>
          <div class="text">
            <strong>App installieren</strong>
            <small>Für schnelleren Zugriff zum Startbildschirm hinzufügen</small>
          </div>
        </div>

        <!-- Main Upload Card -->
        <div class="card" id="uploadCard">
          <h1>📋 Dokument scannen</h1>
          
          <!-- Status Bar -->
          <div class="status-bar hidden" id="statusBar">
            <span id="statusIcon">⚠️</span>
            <span id="statusText">Status</span>
          </div>
          
          <p>Machen Sie ein Foto vom Fahrzeugschein oder wählen Sie eine Datei aus.</p>
          
          <label class="upload-btn" id="cameraBtn">
            📷 Kamera öffnen
            <input type="file" id="cameraInput" accept="image/*" capture="environment">
          </label>
          
          <label class="upload-btn secondary" id="galleryBtn">
            🖼️ Aus Galerie wählen
            <input type="file" id="fileInput" accept="image/*">
          </label>

          <div class="spinner hidden" id="spinner"></div>
          
          <!-- Pending Uploads -->
          <div class="pending-list hidden" id="pendingList">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <strong>⏳ Wartende Uploads</strong>
              <span class="pending-count" id="pendingCount">0</span>
            </div>
            <div id="pendingItems"></div>
            <button class="upload-btn" style="margin-top: 0.75rem; margin-bottom: 0;" onclick="retrySynce()" id="retryBtn">
              🔄 Jetzt synchronisieren
            </button>
          </div>
        </div>

        <!-- Success Card -->
        <div class="card hidden" id="successCard">
          <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <h1>Erfolgreich!</h1>
          <p id="successMessage">Das Bild wurde an den PC übertragen.</p>
          <button onclick="resetUI()" class="upload-btn success">✓ Weiteres Bild</button>
        </div>

        <!-- Offline Card -->
        <div class="card hidden" id="offlineCard">
          <h1>📴 Offline gespeichert</h1>
          <p>Das Bild wurde lokal gespeichert und wird automatisch hochgeladen, sobald Sie wieder online sind.</p>
          <button onclick="resetUI()" class="upload-btn secondary">✓ Weiteres Bild</button>
        </div>

        <script>
          // DOM Elements
          const cameraInput = document.getElementById('cameraInput');
          const fileInput = document.getElementById('fileInput');
          const uploadCard = document.getElementById('uploadCard');
          const successCard = document.getElementById('successCard');
          const offlineCard = document.getElementById('offlineCard');
          const spinner = document.getElementById('spinner');
          const statusBar = document.getElementById('statusBar');
          const statusIcon = document.getElementById('statusIcon');
          const statusText = document.getElementById('statusText');
          const pendingList = document.getElementById('pendingList');
          const pendingCount = document.getElementById('pendingCount');
          const pendingItems = document.getElementById('pendingItems');
          const installPrompt = document.getElementById('installPrompt');
          
          let deferredPrompt = null;
          let isOnline = navigator.onLine;

          // Initialize
          document.addEventListener('DOMContentLoaded', async () => {
            await registerServiceWorker();
            await requestNotificationPermission();
            updateOnlineStatus();
            updatePendingList();
          });

          // Service Worker Registration
          async function registerServiceWorker() {
            if ('serviceWorker' in navigator) {
              try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registered:', registration);
                
                // Listen for sync complete messages
                navigator.serviceWorker.addEventListener('message', (event) => {
                  if (event.data.type === 'SYNC_COMPLETE') {
                    showStatus('success', '✅', event.data.count + ' Foto(s) synchronisiert und gelöscht');
                    updatePendingList();
                  }
                });
              } catch (error) {
                console.error('SW registration failed:', error);
              }
            }
          }

          // Request notification permission
          async function requestNotificationPermission() {
            if ('Notification' in window && Notification.permission === 'default') {
              await Notification.requestPermission();
            }
          }

          // Install prompt
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installPrompt.classList.remove('hidden');
          });

          async function installApp() {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              const result = await deferredPrompt.userChoice;
              if (result.outcome === 'accepted') {
                installPrompt.classList.add('hidden');
              }
              deferredPrompt = null;
            }
          }

          // Online/Offline handling
          window.addEventListener('online', () => {
            isOnline = true;
            updateOnlineStatus();
            triggerSync();
          });

          window.addEventListener('offline', () => {
            isOnline = false;
            updateOnlineStatus();
          });

          function updateOnlineStatus() {
            if (!isOnline) {
              showStatus('offline', '📴', 'Offline - Uploads werden gespeichert');
            } else {
              hideStatus();
            }
          }

          function showStatus(type, icon, text) {
            statusBar.className = 'status-bar ' + type;
            statusBar.classList.remove('hidden');
            statusIcon.textContent = icon;
            statusText.textContent = text;
          }

          function hideStatus() {
            statusBar.classList.add('hidden');
          }

          // IndexedDB Functions
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

          async function saveToIndexedDB(file) {
            const db = await openDB();
            const blob = file;
            const filename = file.name || 'photo-' + Date.now() + '.jpg';
            
            return new Promise((resolve, reject) => {
              const transaction = db.transaction('pendingPhotos', 'readwrite');
              const store = transaction.objectStore('pendingPhotos');
              const request = store.add({ blob, filename, timestamp: Date.now() });
              
              request.onerror = () => reject(request.error);
              request.onsuccess = () => resolve(request.result);
            });
          }

          async function getPendingPhotos() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
              const transaction = db.transaction('pendingPhotos', 'readonly');
              const store = transaction.objectStore('pendingPhotos');
              const request = store.getAll();
              
              request.onerror = () => reject(request.error);
              request.onsuccess = () => resolve(request.result);
            });
          }

          async function deleteFromIndexedDB(id) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
              const transaction = db.transaction('pendingPhotos', 'readwrite');
              const store = transaction.objectStore('pendingPhotos');
              const request = store.delete(id);
              
              request.onerror = () => reject(request.error);
              request.onsuccess = () => resolve();
            });
          }

          async function updatePendingList() {
            try {
              const photos = await getPendingPhotos();
              
              if (photos.length > 0) {
                pendingList.classList.remove('hidden');
                pendingCount.textContent = photos.length;
                pendingItems.innerHTML = photos.map(p => 
                  '<div class="pending-item"><span>📷 ' + p.filename + '</span><span>' + 
                  new Date(p.timestamp).toLocaleTimeString('de-DE') + '</span></div>'
                ).join('');
              } else {
                pendingList.classList.add('hidden');
              }
            } catch (e) {
              console.error('Failed to update pending list:', e);
            }
          }

          // Upload handling
          async function handleUpload(file) {
            spinner.classList.remove('hidden');
            
            if (!isOnline) {
              // Offline - save to IndexedDB
              try {
                await saveToIndexedDB(file);
                await updatePendingList();
                await triggerSync();
                showOfflineSuccess();
              } catch (error) {
                alert('Fehler beim Speichern: ' + error.message);
              }
              spinner.classList.add('hidden');
              return;
            }

            // Online - upload directly
            const formData = new FormData();
            formData.append('photo', file);
            
            try {
              const response = await fetch('/upload', {
                method: 'POST',
                body: formData
              });
              
              if (response.ok) {
                showSuccess('Das Bild wurde erfolgreich an den PC übertragen.');
              } else {
                throw new Error('Upload fehlgeschlagen');
              }
            } catch (err) {
              // Network error - save offline
              console.log('Upload failed, saving offline:', err);
              await saveToIndexedDB(file);
              await updatePendingList();
              await triggerSync();
              showOfflineSuccess();
            } finally {
              spinner.classList.add('hidden');
              cameraInput.value = '';
              fileInput.value = '';
            }
          }

          async function triggerSync() {
            if ('serviceWorker' in navigator && 'sync' in window.SyncManager) {
              const registration = await navigator.serviceWorker.ready;
              try {
                await registration.sync.register('upload-photos');
                console.log('Background sync registered');
              } catch (e) {
                console.log('Background sync not supported, will retry manually');
              }
            }
          }

          async function retrySync() {
            if (!isOnline) {
              alert('Keine Internetverbindung');
              return;
            }

            showStatus('syncing', '🔄', 'Synchronisiere...');
            
            try {
              const photos = await getPendingPhotos();
              let successCount = 0;
              
              for (const photo of photos) {
                const formData = new FormData();
                formData.append('photo', photo.blob, photo.filename);
                
                try {
                  const response = await fetch('/upload', { method: 'POST', body: formData });
                  if (response.ok) {
                    await deleteFromIndexedDB(photo.id);
                    successCount++;
                  }
                } catch (e) {
                  console.error('Failed to sync photo:', e);
                }
              }
              
              await updatePendingList();
              
              if (successCount > 0) {
                showStatus('success', '✅', successCount + ' Foto(s) hochgeladen und gelöscht');
                
                // Show notification
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Upload erfolgreich', {
                    body: successCount + ' Foto(s) wurden synchronisiert',
                    icon: '/icons/icon-192.png'
                  });
                }
              }
            } catch (e) {
              showStatus('offline', '❌', 'Synchronisierung fehlgeschlagen');
            }
          }

          function showSuccess(message) {
            uploadCard.classList.add('hidden');
            offlineCard.classList.add('hidden');
            successCard.classList.remove('hidden');
            document.getElementById('successMessage').textContent = message;
          }

          function showOfflineSuccess() {
            uploadCard.classList.add('hidden');
            successCard.classList.add('hidden');
            offlineCard.classList.remove('hidden');
          }

          function resetUI() {
            uploadCard.classList.remove('hidden');
            successCard.classList.add('hidden');
            offlineCard.classList.add('hidden');
            updatePendingList();
          }

          // Event listeners
          cameraInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleUpload(e.target.files[0]);
          });

          fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleUpload(e.target.files[0]);
          });
        </script>
      </body>
      </html>
    \`)
  })

  expressApp.post('/upload', upload.single('photo'), (req, res) => {
    if (req.file) {
      mainWindow.webContents.send('mobile-file-uploaded', req.file.path)
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'No file uploaded' })
    }
  })

  return new Promise((resolve, reject) => {
    server = expressApp.listen(PORT, '0.0.0.0', async () => {
      try {
        // Try to start localtunnel
        tunnel = await localtunnel({ port: PORT })
        logger.info('Tunnel started at:', { url: tunnel.url })
        
        // Fetch public IP for password
        let publicIp = ''
        try {
          const ipRes = await axios.get('https://api.ipify.org?format=json')
          publicIp = ipRes.data.ip
        } catch (e) {
          logger.warn('Failed to fetch public IP', e)
        }

        resolve({ url: tunnel.url, publicIp })
      } catch (err) {
        logger.error('Tunnel failed, falling back to local IP:', err)
        const ip = getLocalIp()
        resolve({ url: `http://${ip}:${PORT}` })
      }
    })
    server.on('error', (err) => reject(err))
  })
}

export const stopMobileServer = async () => {
  if (tunnel) {
    tunnel.close()
    tunnel = null
  }
  if (server) {
    return new Promise<void>((resolve) => {
      server?.close(() => {
        server = null
        resolve()
      })
    })
  }
}

function getLocalIp() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}
