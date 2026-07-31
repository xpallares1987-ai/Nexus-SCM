import { eventBus, EventTypes } from './eventBus';

const DB_NAME = 'freight_pwa_db';
const DB_VERSION = 1;

export interface SyncRecord<T = any> {
  id: string;
  type: 'shipments' | 'parties' | 'rates';
  data: T;
  syncStatus: 'synced' | 'pending' | 'error';
  updatedAt: number;
}

export class SyncService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('offline_data')) {
          db.createObjectStore('offline_data', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        eventBus.emit(EventTypes.SYNC_READY);
        resolve();
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB init error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveLocalData(type: string, id: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_data'], 'readwrite');
      const store = transaction.objectStore('offline_data');
      const record: SyncRecord = {
        id: `${type}_${id}`,
        type: type as any,
        data,
        syncStatus: 'synced',
        updatedAt: Date.now()
      };
      
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  async getLocalData(type: string): Promise<any[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_data'], 'readonly');
      const store = transaction.objectStore('offline_data');
      const request = store.getAll();
      
      request.onsuccess = (event: any) => {
        const all = event.target.result as SyncRecord[];
        resolve(all.filter(r => r.type === type).map(r => r.data));
      };
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  async enqueueSync(method: string, endpoint: string, payload: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.add({ method, endpoint, payload, timestamp: Date.now() });
      
      request.onsuccess = () => {
        eventBus.emit(EventTypes.SYNC_ENQUEUED);
        // Trigger background sync if possible
        this.attemptSync();
        resolve();
      };
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  async attemptSync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Offline. Sync postponed.');
      return;
    }
    
    if (!this.db) await this.init();
    const transaction = this.db!.transaction(['sync_queue'], 'readonly');
    const store = transaction.objectStore('sync_queue');
    const request = store.getAll();
    
    request.onsuccess = async (event: any) => {
      const items = event.target.result;
      if (items.length === 0) return;
      
      console.log(`Attempting to sync ${items.length} items...`);
      for (const item of items) {
        try {
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          
          if (res.ok) {
            const delTx = this.db!.transaction(['sync_queue'], 'readwrite');
            delTx.objectStore('sync_queue').delete(item.id);
            eventBus.emit(EventTypes.ITEM_SYNCED, item);
          }
        } catch (err) {
          console.error('Sync failed for item', item, err);
          // Stop syncing on first network error assuming we went offline again
          break; 
        }
      }
      eventBus.emit(EventTypes.SYNC_COMPLETED);
    };
  }
}

export const syncService = new SyncService();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncService.attemptSync();
  });
}
