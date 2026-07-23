/**
 * @file offlineQueue.ts
 * @description Background IndexedDB queue for offline-first document uploads,
 * facilitating seamless synchronization once internet connectivity is restored.
 */

export interface QueuedDocument {
  id: string; // Temporary local UUID
  shipmentId: string;
  documentType: string;
  fileName: string;
  fileBase64: string;
  fileSize: string;
  comments: string;
  folderId: string | null;
  uploadedBy: string;
  createdAt: number;
  parentDocumentId?: string;
}

const DB_NAME = 'SCM_Offline_DB';
const STORE_NAME = 'document_upload_queue';
const CACHE_STORE_NAME = 'voyage_manifest_cache';
const DB_VERSION = 2;

/**
 * Initializes and opens the IndexedDB database with upgrade support
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Adds a document upload package to the IndexedDB offline queue
 */
export async function queueOfflineDocument(doc: Omit<QueuedDocument, 'id' | 'createdAt'>): Promise<QueuedDocument> {
  const db = await openDB();
  const queuedItem: QueuedDocument = {
    ...doc,
    id: `local-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(queuedItem);

    request.onsuccess = () => {
      resolve(queuedItem);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieves all currently queued documents from IndexedDB
 */
export async function getQueuedOfflineDocuments(): Promise<QueuedDocument[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deletes a processed document from the offline queue
 */
export async function deleteFromOfflineQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Automatically triggers background synchronization of all queued files with the S3 backend
 */
export async function synchronizeOfflineQueue(
  token: string, 
  uploadFn: (shipmentId: string, payload: any) => Promise<any>
): Promise<{ successCount: number; failedCount: number }> {
  const queue = await getQueuedOfflineDocuments();
  let successCount = 0;
  let failedCount = 0;

  for (const doc of queue) {
    try {
      await uploadFn(doc.shipmentId, {
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileUrl: doc.fileBase64,
        uploadedBy: doc.uploadedBy,
        comments: `${doc.comments} (Synced from port-offline queue)`,
        fileSize: doc.fileSize,
        parentDocumentId: doc.parentDocumentId,
        folderId: doc.folderId
      });
      await deleteFromOfflineQueue(doc.id);
      successCount++;
    } catch (error) {
      console.error(`Failed to synchronize offline document ${doc.fileName}:`, error);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}

export interface CachedVoyageDocument {
  id: string;
  shipmentId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  status: string;
  comments?: string;
  fileSize?: string;
  createdAt: string;
  extractedMetadata?: any;
  tags?: string[];
  folderId?: string;
}

/**
 * Persists an array of active voyage manifest documents into IndexedDB
 */
export async function cacheVoyageDocuments(docs: CachedVoyageDocument[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);
    
    // Clear existing cache first to avoid storing stale versions
    store.clear();

    let completed = 0;
    let hasError = false;

    if (docs.length === 0) {
      resolve();
      return;
    }

    docs.forEach((doc) => {
      const request = store.put(doc);
      request.onsuccess = () => {
        completed++;
        if (completed === docs.length && !hasError) {
          resolve();
        }
      };
      request.onerror = () => {
        hasError = true;
        reject(request.error);
      };
    });
  });
}

/**
 * Retrieves all cached voyage manifests from the local IndexedDB
 */
export async function getCachedVoyageDocuments(): Promise<CachedVoyageDocument[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(CACHE_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

