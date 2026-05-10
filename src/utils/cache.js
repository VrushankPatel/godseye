/**
 * IndexedDB browser cache for layer data
 * Provides structured storage beyond localStorage
 */

const DB_NAME = 'godseye-cache';
const DB_VERSION = 1;
const STORE_NAME = 'layer-cache';

let dbInstance = null;

async function openDB() {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

export async function readLayerCache(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result?.value || null);
            };
        });
    } catch (error) {
        console.warn('[Cache] Read failed:', error.message);
        return null;
    }
}

export async function writeLayerCache(key, value, ttlMs = 3600000) {
    try {
        const db = await openDB();
        const record = {
            key,
            value,
            timestamp: Date.now(),
            expiresAt: ttlMs ? Date.now() + ttlMs : null,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(record);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    } catch (error) {
        console.warn('[Cache] Write failed:', error.message);
        return false;
    }
}

export async function deleteLayerCache(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    } catch (error) {
        console.warn('[Cache] Delete failed:', error.message);
        return false;
    }
}

export async function clearExpiredCache() {
    try {
        const db = await openDB();
        const now = Date.now();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();

            let deleted = 0;
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.expiresAt && cursor.value.expiresAt < now) {
                        cursor.delete();
                        deleted += 1;
                    }
                    cursor.continue();
                } else {
                    resolve(deleted);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('[Cache] Clear expired failed:', error.message);
        return 0;
    }
}

export async function getCacheStats() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve({ count: request.result });
        });
    } catch (error) {
        return { count: 0 };
    }
}

export function isCacheValid(record) {
    if (!record) return false;
    if (!record.timestamp) return false;
    if (record.expiresAt && record.expiresAt < Date.now()) return false;
    return true;
}