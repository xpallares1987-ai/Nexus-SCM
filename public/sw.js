const STATIC_CACHE_NAME = 'scm-static-v1';
const API_CACHE_NAME = 'scm-api-v1';

// Static resources to cache on install
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
];

// Install event: Pre-cache core shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching offline shell');
        return cache.addAll(PRE_CACHE_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper to check if request is an API request
const isApiRequest = (url) => {
  return url.pathname.startsWith('/api/');
};

// Fetch event: Apply strategies based on request type
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests for standard caching
  if (event.request.method !== 'GET') {
    // We could queue offline operations or simply bypass caching
    return;
  }

  // Skip WebSocket, hot reload, chrome-extension, and other protocols
  if (!event.request.url.startsWith('http') && !event.request.url.startsWith('https')) {
    return;
  }

  // Bypass caching entirely in development to prevent stale assets/React hooks conflicts
  if (
    self.location.hostname === 'localhost' || 
    self.location.hostname === '127.0.0.1' || 
    self.location.hostname.includes('run.app') ||
    requestUrl.pathname.includes('@vite') ||
    requestUrl.pathname.includes('@fs') ||
    requestUrl.pathname.includes('node_modules') ||
    requestUrl.pathname.endsWith('.tsx') ||
    requestUrl.pathname.endsWith('.ts')
  ) {
    return;
  }

  // Handle API Requests: Network-First Strategy
  if (isApiRequest(requestUrl)) {
    // Avoid caching certain stream or real-time endpoints if any
    if (requestUrl.pathname.includes('/events') || requestUrl.pathname.includes('/stream')) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // If response is valid, clone and save to API cache
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[Service Worker] Network failed, searching cache for:', event.request.url);
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If neither network nor cache matches, return a friendly offline JSON response
            return new Response(
              JSON.stringify({
                error: 'You are currently offline. This request could not be completed and no cached data is available.',
                offline: true,
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Handle Static Assets & UI Files: Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[Service Worker] Failed to fetch asset from network:', event.request.url, err);
          // Return cachedResponse or let it fail
          return cachedResponse;
        });

      // Return cached response immediately if found, else wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// Push Event: Handle incoming push notifications from a server
self.addEventListener('push', (event) => {
  let data = { title: 'New Alert', body: 'You have a new notification.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

// Notification Click Event: Handle when a user clicks a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- Background Sync API Setup ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shipments') {
    event.waitUntil(syncShipments());
  }
});

async function syncShipments() {
  const db = await openSyncDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  const store = tx.objectStore('sync-queue');
  const requests = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (requests.length === 0) return;

  console.log(`[Service Worker] Syncing ${requests.length} offline shipment updates...`);

  for (const item of requests) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (response.status === 409) {
        const errorData = await response.json();
        const clientsList = await self.clients.matchAll({ type: 'window' });
        for (const client of clientsList) {
          client.postMessage({ type: 'SYNC_CONFLICT', item, serverVersion: errorData.serverVersion });
        }
        const delTx = db.transaction('sync-queue', 'readwrite');
        delTx.objectStore('sync-queue').delete(item.id);
        await new Promise(r => delTx.oncomplete = r);
      } else if (response.ok || response.status >= 400) {
        // Successfully synced or permanent error (4xx) - remove from queue
        const delTx = db.transaction('sync-queue', 'readwrite');
        delTx.objectStore('sync-queue').delete(item.id);
        await new Promise(r => delTx.oncomplete = r);
      }
    } catch (err) {
      console.warn('[Service Worker] Sync failed for item, will retry later', item.id, err);
      // Throwing here will tell the browser the sync failed and to retry it later
      throw err;
    }
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scm-sync-db', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}
