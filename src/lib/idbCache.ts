import { get, set, del } from 'idb-keyval';

export const cacheData = async <T>(key: string, data: T): Promise<void> => {
  try {
    await set(key, data);
  } catch (err) {
    console.error('Failed to cache data in IndexedDB', err);
  }
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const val = await get<T>(key);
    return val !== undefined ? val : null;
  } catch (err) {
    console.error('Failed to get cached data from IndexedDB', err);
    return null;
  }
};

export const clearCache = async (key: string): Promise<void> => {
  try {
    await del(key);
  } catch (err) {
    console.error('Failed to clear cached data from IndexedDB', err);
  }
};
