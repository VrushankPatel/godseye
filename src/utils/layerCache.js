const CACHE_PREFIX = 'godseye.layer-cache.v1';

function getStorage() {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch (err) {
        return null;
    }
}

function getCacheKey(key) {
    return `${CACHE_PREFIX}:${key}`;
}

export function readLayerCache(key, maxAgeMs = Infinity) {
    const storage = getStorage();
    if (!storage) return null;

    try {
        const raw = storage.getItem(getCacheKey(key));
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;

        const savedAt = Number(parsed.savedAt || 0);
        if (!savedAt || !Number.isFinite(savedAt)) return null;
        if (Date.now() - savedAt > maxAgeMs) return null;

        return parsed.data ?? null;
    } catch (err) {
        return null;
    }
}

export function writeLayerCache(key, data) {
    const storage = getStorage();
    if (!storage) return;

    try {
        storage.setItem(
            getCacheKey(key),
            JSON.stringify({
                savedAt: Date.now(),
                data,
            })
        );
    } catch (err) {
        // Ignore storage failures; cache should never break live feeds.
    }
}
