const CACHE_NAME = 'scm-warehouse-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install Event: Pre-cache critical application shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching critical UI shell assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First caching strategy for critical UI assets & offline responsiveness
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET requests or non-http(s) schemas (e.g., chrome-extension)
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Network-First Strategy
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful HTTP 200 responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        console.log('[SW] Network request failed, attempting offline cache match for:', request.url);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // For navigation HTML requests when offline, serve the cached SPA index.html
        if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
          const fallbackHtml = await caches.match('/index.html');
          if (fallbackHtml) {
            return fallbackHtml;
          }
        }

        // Return standard offline fallback JSON for API calls if unhandled
        if (request.url.includes('/api/')) {
          // If it's a POST/PUT request and offline, we could queue it via IndexedDB
          // but usually this is handled by the frontend before calling fetch.
          // The background sync event will process queued items.
          return new Response(
            JSON.stringify({ offline: true, message: 'Operando en modo offline. Los cambios se sincronizarán al reconectar.' }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          );
        }
      })
  );
});

// Background Sync Event Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-warehouse-scans') {
    event.waitUntil(
      (async () => {
        try {
          const request = indexedDB.open('scm-offline-sync', 1);
          const db = await new Promise((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
              e.target.result.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
            };
          });

          const tx = db.transaction('sync-queue', 'readonly');
          const store = tx.objectStore('sync-queue');
          const allRecords = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          for (const record of allRecords) {
            try {
              await fetch(record.url, {
                method: record.method,
                headers: record.headers,
                body: record.body
              });
              // Remove successfully sent record
              const delTx = db.transaction('sync-queue', 'readwrite');
              delTx.objectStore('sync-queue').delete(record.id);
            } catch (err) {
              console.error('[SW] Sync failed for record:', record.id, err);
            }
          }
        } catch (err) {
          console.error('[SW] Sync process error:', err);
        }
      })()
    );
  }
});

// Push Notifications Listener
self.addEventListener('push', function(event) {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notificación de SCM', body: event.data.text() };
    }
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        { action: 'mark_action_taken', title: '✓ Marcar como Tomada Acción' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Alerta SCM', options)
    );
  }
});

// Notification Click Listener
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'mark_action_taken') {
    event.waitUntil(
      fetch('/api/notifications/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: event.notification.data?.id || 'unknown', status: 'Acción Tomada' })
      })
    );
    return;
  }
  
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
