import { MemoryCache } from '../cache.mjs';

const flightCache = new MemoryCache(20);
const CACHE_TTL_MS = 8000; // 8 seconds

const FLIGHT_SOURCES = [
  'https://api.airplanes.live/v2/mil',
  'https://opendata.adsb.lol/v2/mil',
];

export async function handleFlights(req, res, searchParams) {
  const mode = searchParams.get('mode') || 'mil';
  const cacheKey = `flights:${mode}`;

  const cached = flightCache.get(cacheKey);
  if (cached) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Cache': 'HIT',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(cached));
    return;
  }

  let result = null;
  for (const url of FLIGHT_SOURCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GodsEye-Console/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        if (data && (Array.isArray(data.ac) || Array.isArray(data.aircraft))) {
          result = data;
          break;
        }
      }
    } catch {
      continue;
    }
  }

  if (result) {
    flightCache.set(cacheKey, result, CACHE_TTL_MS);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(result));
  } else {
    // Serve stale if available
    const stale = flightCache.getStale(cacheKey);
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
    res.end(JSON.stringify({ error: 'All flight data upstreams failed' }));
  }
}
