export async function queueShipmentUpdate(
  url: string, 
  method: string, 
  body: any, 
  headers: Record<string, string> = { 'Content-Type': 'application/json' }
) {
  // 1. Add to IndexedDB
  const db = await openSyncDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  const store = tx.objectStore('sync-queue');
  
  await new Promise((resolve, reject) => {
    const req = store.add({
      url,
      method,
      body,
      headers,
      timestamp: Date.now()
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  // 2. Request background sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-shipments');
      console.log('[Background Sync] Registered for shipment update');
    } catch (err) {
      console.warn('[Background Sync] Could not be registered', err);
    }
  } else {
    console.warn('[Background Sync] Not supported by this browser. Changes will remain in queue until next visit.');
    // Fallback: we could add a listener to online event to manually flush
  }
}

export async function getQueuedUpdatesCount(): Promise<number> {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('sync-queue', 'readonly');
    const store = tx.objectStore('sync-queue');
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return 0;
  }
}

function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scm-sync-db', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
  });
}

export async function flushSyncQueue() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('sync-queue', 'readonly');
    const store = tx.objectStore('sync-queue');
    const requests = await new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (requests.length === 0) return;

    console.log(`[Sync Queue] Manually flushing ${requests.length} offline updates...`);

    for (const item of requests) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (response.status === 409) {
          const errorData = await response.json();
          window.dispatchEvent(new CustomEvent('sync_conflict', { detail: { item, serverVersion: errorData.serverVersion } }));
          const delTx = db.transaction('sync-queue', 'readwrite');
          delTx.objectStore('sync-queue').delete(item.id);
          await new Promise(r => (delTx.oncomplete = r as any));
        } else if (response.ok || response.status >= 400) {
          const delTx = db.transaction('sync-queue', 'readwrite');
          delTx.objectStore('sync-queue').delete(item.id);
          await new Promise(r => (delTx.oncomplete = r as any));
        }
      } catch (err) {
        console.warn('[Sync Queue] Sync failed for item', item.id, err);
      }
    }
  } catch (e) {
    console.error('Failed to flush sync queue manually', e);
  }
}
