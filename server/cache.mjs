import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const CACHE_DIR = path.resolve(process.cwd(), '.cache/godseye');

try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch {
  // Ignore
}

/**
 * In-memory LRU cache item with timestamp and TTL
 */
export class MemoryCache {
  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh access order (LRU)
    this.store.delete(key);
    this.store.set(key, item);
    return item.value;
  }

  getStale(key) {
    const item = this.store.get(key);
    return item ? item.value : null;
  }

  set(key, value, ttlMs) {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      cachedAt: Date.now(),
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

/**
 * File-system disk cache for surviving restarts
 */
export class DiskCache {
  constructor(subDir = 'default') {
    this.dir = path.join(CACHE_DIR, subDir);
    try {
      fs.mkdirSync(this.dir, { recursive: true });
    } catch {
      // Ignore
    }
  }

  _keyToPath(key) {
    const hash = createHash('sha256').update(key).digest('hex');
    return path.join(this.dir, `${hash}.json`);
  }

  get(key, ttlMs) {
    const filePath = this._keyToPath(key);
    try {
      if (!fs.existsSync(filePath)) return null;
      const stat = fs.statSync(filePath);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > ttlMs) {
        return null;
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getStale(key) {
    const filePath = this._keyToPath(key);
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  set(key, value) {
    const filePath = this._keyToPath(key);
    try {
      fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
    } catch {
      // Ignore disk write errors gracefully
    }
  }
}

/**
 * In-flight coalescing map
 */
export class InFlightMap {
  constructor() {
    this.map = new Map();
  }

  get(key) {
    return this.map.get(key) || null;
  }

  run(key, fetcher) {
    const existing = this.map.get(key);
    if (existing) {
      return existing;
    }
    const promise = Promise.resolve()
      .then(fetcher)
      .finally(() => {
        this.map.delete(key);
      });
    this.map.set(key, promise);
    return promise;
  }
}

export { CACHE_DIR };
