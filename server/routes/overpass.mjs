import { MemoryCache, DiskCache, InFlightMap } from '../cache.mjs';

const OVERPASS_MAX_BODY_BYTES = 64 * 1024;
const OVERPASS_MEMORY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const OVERPASS_DISK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const OVERPASS_MAX_TIMEOUT_S = 25;
const OVERPASS_MAX_BBOX_DEG = 1.5; // ~160km max span

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

const memCache = new MemoryCache(200);
const diskCache = new DiskCache('overpass');
const inFlight = new InFlightMap();

function readBodyCapped(req, limitBytes) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > limitBytes) {
        req.destroy();
        const err = new Error('Payload Too Large');
        err.code = 'BODY_TOO_LARGE';
        reject(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function sanitizeOverpassQuery(rawBody) {
  let query = rawBody;
  if (rawBody.startsWith('data=')) {
    try {
      const params = new URLSearchParams(rawBody);
      query = params.get('data') || '';
    } catch {
      // Keep rawBody
    }
  }

  if (!query || !query.trim()) {
    return { ok: false, error: 'Empty Overpass query' };
  }

  // Check bbox sizes
  const bboxRegex = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
  for (const match of query.matchAll(bboxRegex)) {
    const s = Number(match[1]);
    const w = Number(match[2]);
    const n = Number(match[3]);
    const e = Number(match[4]);
    if (Math.abs(n - s) > OVERPASS_MAX_BBOX_DEG || Math.abs(e - w) > OVERPASS_MAX_BBOX_DEG) {
      return { ok: false, error: 'Overpass bounding box too large' };
    }
  }

  // Clamp timeout
  const clamped = query.replace(
    /\[timeout:\s*(\d+)\s*\]/gi,
    (_, sec) => `[timeout:${Math.min(Number(sec) || OVERPASS_MAX_TIMEOUT_S, OVERPASS_MAX_TIMEOUT_S)}]`
  );

  return { ok: true, query: clamped };
}

async function fetchFromMirrors(query) {
  let lastError = null;

  for (const mirror of MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), (OVERPASS_MAX_TIMEOUT_S + 5) * 1000);

      const res = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'GodsEye-Console/1.0 (Geospatial Intelligence)',
          'Accept': 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.elements)) {
          return { ok: true, data: json, mirror };
        }
      }

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Mirror ${mirror} status ${res.status}`);
        continue;
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All Overpass mirrors failed');
}

export async function handleOverpassRequest(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let rawBody = '';
  try {
    rawBody = await readBodyCapped(req, OVERPASS_MAX_BODY_BYTES);
  } catch (err) {
    res.writeHead(err.code === 'BODY_TOO_LARGE' ? 413 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
    return;
  }

  const sanitization = sanitizeOverpassQuery(rawBody);
  if (!sanitization.ok) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: sanitization.error }));
    return;
  }

  const cleanQuery = sanitization.query;
  const cacheKey = cleanQuery.replace(/\s+/g, ' ').trim();

  // 1. Check Memory Cache
  const memoryHit = memCache.get(cacheKey);
  if (memoryHit) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Cache': 'HIT-MEMORY',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(memoryHit));
    return;
  }

  // 2. Check Disk Cache
  const diskHit = diskCache.get(cacheKey, OVERPASS_DISK_TTL_MS);
  if (diskHit) {
    memCache.set(cacheKey, diskHit, OVERPASS_MEMORY_TTL_MS);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Cache': 'HIT-DISK',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(diskHit));
    return;
  }

  // 3. In-flight coalescing & Upstream Fetch
  try {
    const payload = await inFlight.run(cacheKey, async () => {
      const result = await fetchFromMirrors(cleanQuery);
      return result.data;
    });

    memCache.set(cacheKey, payload, OVERPASS_MEMORY_TTL_MS);
    diskCache.set(cacheKey, payload);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(payload));
  } catch (err) {
    // 4. Serve-stale fallback if upstream failed
    const stale = memCache.getStale(cacheKey) || diskCache.getStale(cacheKey);
    if (stale) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Cache': 'STALE',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(stale));
      return;
    }

    res.writeHead(502, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Overpass mirrors unavailable', details: err.message }));
  }
}
