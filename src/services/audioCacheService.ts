// High-Performance Audio Cache Service using IndexedDB

const DB_NAME = 'crafted_audio_cache_db';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

class AudioCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryCache = new Map<string, string>(); // trackId -> objectUrl

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Get cached blob URL for instant 0ms playback
   */
  public async getCachedAudioUrl(trackId: string): Promise<string | null> {
    if (this.memoryCache.has(trackId)) {
      return this.memoryCache.get(trackId)!;
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(trackId);

        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            const objectUrl = URL.createObjectURL(req.result.blob);
            this.memoryCache.set(trackId, objectUrl);
            resolve(objectUrl);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  /**
   * Cache audio blob for a track in the background
   */
  public async cacheAudioBlob(trackId: string, blob: Blob): Promise<string> {
    const objectUrl = URL.createObjectURL(blob);
    this.memoryCache.set(trackId, objectUrl);

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        id: trackId,
        blob,
        cachedAt: Date.now(),
        size: blob.size,
      });
    } catch (e) {
      console.warn('Failed to persist audio blob to IndexedDB:', e);
    }

    return objectUrl;
  }

  /**
   * Pre-cache or fetch in background
   */
  public async fetchAndCacheAudio(trackId: string, audioUrl: string): Promise<string | null> {
    const existing = await this.getCachedAudioUrl(trackId);
    if (existing) return existing;

    try {
      const res = await fetch(audioUrl);
      if (res.ok) {
        const blob = await res.blob();
        return await this.cacheAudioBlob(trackId, blob);
      }
    } catch (e) {
      console.warn('Background cache fetch failed:', e);
    }
    return null;
  }

  /**
   * Clear audio cache
   */
  public async clearCache(): Promise<void> {
    this.memoryCache.forEach((url) => URL.revokeObjectURL(url));
    this.memoryCache.clear();

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch (e) {}
  }
}

export const audioCacheService = new AudioCacheService();
