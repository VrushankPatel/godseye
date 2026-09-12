import { MemoryCache } from '../cache.mjs';

const flightCache = new MemoryCache(40);
const CACHE_TTL_MS = 8000; // 8 seconds

const USER_AGENT = 'GodsEyeTactical/2.0 (https://github.com/VrushankPatel/godseye; contact: ops@godseye.internal)';

export async function handleFlights(req, res, searchParams) {
  const mode = (searchParams.get('mode') || 'all').toLowerCase();
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius');

  const cacheKey = lat && lon && radius ? `flights:point:${lat}:${lon}:${radius}` : `flights:${mode}`;

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

  let urls = [];
  if (lat && lon && radius) {
    urls = [
      `https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`,
      `https://api.adsb.one/v2/point/${lat}/${lon}/${radius}`,
    ];
  } else if (mode === 'mil') {
    urls = [
      'https://api.adsb.lol/v2/mil',
      'https://api.airplanes.live/v2/mil',
    ];
  } else {
    // global / all
    urls = [
      'https://api.adsb.lol/v2/point/0/0/10000',
      'https://api.adsb.lol/v2/mil',
    ];
  }

  let result = null;
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': USER_AGENT,
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

