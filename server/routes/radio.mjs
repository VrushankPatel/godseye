import { MemoryCache } from '../cache.mjs';
const radioCache = new MemoryCache(50);

const RADIO_CACHE_KEY = 'radio:catalog:v1';
const RADIO_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RADIO_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];

// Rich fallback catalog of verified live streaming radio stations covering major countries worldwide
const VERIFIED_WORLD_STATIONS = [
  // India (IN)
  {
    id: 'in-vividh-bharati',
    name: 'AIR Vividh Bharati',
    country: 'India',
    countryCode: 'IN',
    state: 'National',
    lat: 28.6139,
    lon: 77.2090,
    streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    tags: ['air', 'hindi', 'classics', 'news', 'india'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://prasarbharati.gov.in',
  },
  {
    id: 'in-air-fm-gold',
    name: 'AIR FM Gold Delhi',
    country: 'India',
    countryCode: 'IN',
    state: 'Delhi',
    lat: 28.6270,
    lon: 77.2150,
    streamUrl: 'https://stream.zeno.fm/6qv2y2tqdg8uv',
    tags: ['news', 'delhi', 'classics', 'hindi', 'india'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://prasarbharati.gov.in',
  },
  {
    id: 'in-radio-mirchi-983',
    name: 'Radio Mirchi 98.3 FM',
    country: 'India',
    countryCode: 'IN',
    state: 'Maharashtra',
    lat: 19.0760,
    lon: 72.8777,
    streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    tags: ['bollywood', 'hits', 'hindi', 'top40', 'india'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://radiomirchi.com',
  },
  {
    id: 'in-red-fm-935',
    name: 'Red FM 93.5 - Superhits',
    country: 'India',
    countryCode: 'IN',
    state: 'Maharashtra',
    lat: 18.9220,
    lon: 72.8347,
    streamUrl: 'https://stream.zeno.fm/3r24e2tqdg8uv',
    tags: ['bajaate raho', 'bollywood', 'hindi', 'pop', 'india'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://redfmindia.in',
  },
  {
    id: 'in-air-bengaluru',
    name: 'AIR Rainbow FM Bengaluru',
    country: 'India',
    countryCode: 'IN',
    state: 'Karnataka',
    lat: 12.9716,
    lon: 77.5946,
    streamUrl: 'https://stream.zeno.fm/u84ub8qmdg8uv',
    tags: ['kannada', 'bengaluru', 'news', 'music', 'india'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://prasarbharati.gov.in',
  },
  {
    id: 'in-air-chennai',
    name: 'AIR Chennai FM Rainbow',
    country: 'India',
    countryCode: 'IN',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707,
    streamUrl: 'https://stream.zeno.fm/a0r5b8qmdg8uv',
    tags: ['tamil', 'chennai', 'carnatic', 'news', 'india'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://prasarbharati.gov.in',
  },
  {
    id: 'in-air-kolkata',
    name: 'AIR FM Kolkata Geetanjali',
    country: 'India',
    countryCode: 'IN',
    state: 'West Bengal',
    lat: 22.5726,
    lon: 88.3639,
    streamUrl: 'https://stream.zeno.fm/c18mb8qmdg8uv',
    tags: ['bengali', 'kolkata', 'rabindra sangeet', 'news', 'india'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://prasarbharati.gov.in',
  },

  // United States (US)
  {
    id: 'us-wnyc-fm',
    name: 'WNYC 93.9 FM - New York Public Radio',
    country: 'United States',
    countryCode: 'US',
    state: 'New York',
    lat: 40.7128,
    lon: -74.0060,
    streamUrl: 'https://fm939.wnyc.org/wnycfm-app.aac',
    tags: ['npr', 'news', 'talk', 'culture', 'new york'],
    codec: 'AAC',
    bitrate: 128,
    homepage: 'https://www.wnyc.org',
  },
  {
    id: 'us-kexp-903',
    name: 'KEXP 90.3 FM Seattle',
    country: 'United States',
    countryCode: 'US',
    state: 'Washington',
    lat: 47.6062,
    lon: -122.3321,
    streamUrl: 'https://kexp.streamguys1.com/kexp128.mp3',
    tags: ['indie', 'alternative', 'eclectic', 'rock', 'seattle'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.kexp.org',
  },
  {
    id: 'us-kqed-fm',
    name: 'KQED 88.5 FM San Francisco',
    country: 'United States',
    countryCode: 'US',
    state: 'California',
    lat: 37.7749,
    lon: -122.4194,
    streamUrl: 'https://kqed.streamguys1.com/live',
    tags: ['npr', 'news', 'bay area', 'public safety'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.kqed.org',
  },
  {
    id: 'us-somafm-groovesalad',
    name: 'SomaFM: Groove Salad',
    country: 'United States',
    countryCode: 'US',
    state: 'California',
    lat: 37.7690,
    lon: -122.4467,
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    tags: ['ambient', 'chillout', 'downtempo', 'electronic'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://somafm.com',
  },
  {
    id: 'us-somafm-defcon',
    name: 'SomaFM: DEF CON Radio',
    country: 'United States',
    countryCode: 'US',
    state: 'Nevada',
    lat: 36.1699,
    lon: -115.1398,
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    tags: ['electronic', 'techno', 'hacker', 'cyberpunk'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://somafm.com',
  },
  {
    id: 'us-wbgo-jazz',
    name: 'WBGO 88.3 FM Jazz Newark/NYC',
    country: 'United States',
    countryCode: 'US',
    state: 'New Jersey',
    lat: 40.7357,
    lon: -74.1724,
    streamUrl: 'https://wbgo.streamguys1.com/wbgo128',
    tags: ['jazz', 'blues', 'new york', 'classic'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.wbgo.org',
  },

  // United Kingdom (GB)
  {
    id: 'gb-bbc-radio-1',
    name: 'BBC Radio 1 London',
    country: 'United Kingdom',
    countryCode: 'GB',
    state: 'London',
    lat: 51.5074,
    lon: -0.1278,
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',
    tags: ['pop', 'top40', 'electronic', 'dance', 'bbc'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.bbc.co.uk/radio1',
  },
  {
    id: 'gb-bbc-world-service',
    name: 'BBC World Service News',
    country: 'United Kingdom',
    countryCode: 'GB',
    state: 'London',
    lat: 51.5186,
    lon: -0.1437,
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    tags: ['news', 'global', 'talk', 'investigation', 'world'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.bbc.co.uk/worldserviceradio',
  },
  {
    id: 'gb-bbc-radio-4',
    name: 'BBC Radio 4 Speech & Drama',
    country: 'United Kingdom',
    countryCode: 'GB',
    state: 'London',
    lat: 51.5173,
    lon: -0.1420,
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm',
    tags: ['talk', 'drama', 'news', 'culture', 'comedy'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.bbc.co.uk/radio4',
  },
  {
    id: 'gb-classic-fm',
    name: 'Classic FM UK',
    country: 'United Kingdom',
    countryCode: 'GB',
    state: 'London',
    lat: 51.5138,
    lon: -0.1305,
    streamUrl: 'https://media-ssl.musicradio.com/ClassicFMMP3',
    tags: ['classical', 'orchestral', 'relaxing', 'symphony'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.classicfm.com',
  },

  // France (FR)
  {
    id: 'fr-fip-paris',
    name: 'FIP Radio Paris',
    country: 'France',
    countryCode: 'FR',
    state: 'Île-de-France',
    lat: 48.8566,
    lon: 2.3522,
    streamUrl: 'https://icecast.radiofrance.fr/fip-midfi.mp3',
    tags: ['eclectic', 'jazz', 'world', 'funk', 'paris'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.radiofrance.fr/fip',
  },
  {
    id: 'fr-france-inter',
    name: 'France Inter Paris',
    country: 'France',
    countryCode: 'FR',
    state: 'Île-de-France',
    lat: 48.8530,
    lon: 2.2796,
    streamUrl: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3',
    tags: ['news', 'culture', 'talk', 'french', 'paris'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.radiofrance.fr/franceinter',
  },

  // Germany (DE)
  {
    id: 'de-deutschlandfunk',
    name: 'Deutschlandfunk Köln',
    country: 'Germany',
    countryCode: 'DE',
    state: 'Nordrhein-Westfalen',
    lat: 50.9375,
    lon: 6.9603,
    streamUrl: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3',
    tags: ['news', 'talk', 'culture', 'german', 'cologne'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.deutschlandfunk.de',
  },
  {
    id: 'de-sunshine-live',
    name: 'sunshine live - Electronic Music',
    country: 'Germany',
    countryCode: 'DE',
    state: 'Berlin',
    lat: 52.5200,
    lon: 13.4050,
    streamUrl: 'https://stream.sunshine-live.de/live/mp3-128/stream.sunshine-live.de/',
    tags: ['electronic', 'dance', 'techno', 'house', 'berlin'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.sunshine-live.de',
  },

  // Japan (JP)
  {
    id: 'jp-nhk-radio-1',
    name: 'NHK Radio 1 Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    state: 'Tokyo',
    lat: 35.6762,
    lon: 139.6503,
    streamUrl: 'https://stream.zeno.fm/5yrm27tqdg8uv',
    tags: ['news', 'japanese', 'tokyo', 'emergency', 'japan'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.nhk.or.jp/radio/',
  },
  {
    id: 'jp-j-pop-sakura',
    name: 'J-Pop Powerplay Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    state: 'Tokyo',
    lat: 35.6895,
    lon: 139.6917,
    streamUrl: 'https://kathy.torontocast.com:2860/stream',
    tags: ['jpop', 'anime', 'tokyo', 'hits', 'japan'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://japanimradio.com',
  },

  // Australia (AU)
  {
    id: 'au-triple-j',
    name: 'Triple J Sydney',
    country: 'Australia',
    countryCode: 'AU',
    state: 'New South Wales',
    lat: -33.8688,
    lon: 151.2093,
    streamUrl: 'https://live-radio01.mediahubaustralia.com/2TJW/mp3/',
    tags: ['alternative', 'indie', 'australian', 'sydney'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.abc.net.au/triplej/',
  },
  {
    id: 'au-abc-news',
    name: 'ABC News Radio Australia',
    country: 'Australia',
    countryCode: 'AU',
    state: 'Australian Capital Territory',
    lat: -35.2809,
    lon: 149.1300,
    streamUrl: 'https://live-radio01.mediahubaustralia.com/PBW/mp3/',
    tags: ['news', 'politics', 'emergency', 'talk'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.abc.net.au/newsradio/',
  },

  // Canada (CA)
  {
    id: 'ca-cbc-radio-one',
    name: 'CBC Radio One Toronto',
    country: 'Canada',
    countryCode: 'CA',
    state: 'Ontario',
    lat: 43.6532,
    lon: -79.3832,
    streamUrl: 'https://stream.zeno.fm/43wvbbqmdg8uv',
    tags: ['news', 'talk', 'cbc', 'canada', 'toronto'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.cbc.ca/radio',
  },

  // Brazil (BR)
  {
    id: 'br-radio-globo',
    name: 'Rádio Globo Rio de Janeiro',
    country: 'Brazil',
    countryCode: 'BR',
    state: 'Rio de Janeiro',
    lat: -22.9068,
    lon: -43.1729,
    streamUrl: 'https://stream.zeno.fm/83wvbbqmdg8uv',
    tags: ['samba', 'futebol', 'brazil', 'rio', 'latin'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://radioglobo.globo.com',
  },

  // Spain (ES)
  {
    id: 'es-cadena-ser',
    name: 'Cadena SER Madrid',
    country: 'Spain',
    countryCode: 'ES',
    state: 'Madrid',
    lat: 40.4168,
    lon: -3.7038,
    streamUrl: 'https://stream.zeno.fm/1r24e2tqdg8uv',
    tags: ['noticias', 'deportes', 'madrid', 'spain', 'spanish'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://cadenaser.com',
  },

  // Italy (IT)
  {
    id: 'it-rai-radio-1',
    name: 'RAI Radio 1 Roma',
    country: 'Italy',
    countryCode: 'IT',
    state: 'Lazio',
    lat: 41.9028,
    lon: 12.4964,
    streamUrl: 'https://icstream.rai.it/1.mp3',
    tags: ['notizie', 'cultura', 'roma', 'italia', 'italian'],
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.raiplaysound.it',
  },
];

function normalizeStation(raw) {
  if (!raw) return null;
  const id = String(raw.stationuuid || raw.id || '').trim();
  const name = String(raw.name || '').trim();
  const lat = Number(raw.geo_lat ?? raw.lat);
  const lon = Number(raw.geo_long ?? raw.lon);
  const streamUrl = String(raw.url_resolved || raw.url || raw.streamUrl || '').trim();

  if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lon) || !streamUrl) {
    return null;
  }

  // Ensure HTTPS or playable URL
  const secureStreamUrl = streamUrl.startsWith('http://')
    ? streamUrl.replace('http://', 'https://')
    : streamUrl;

  const rawTags = Array.isArray(raw.tags)
    ? raw.tags
    : String(raw.tags || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

  const tags = [...new Set(rawTags.slice(0, 8))];

  return {
    id,
    name,
    country: String(raw.country || '').trim() || 'Worldwide',
    countryCode: String(raw.countrycode || raw.countryCode || '').trim().toUpperCase(),
    state: String(raw.state || '').trim(),
    lat,
    lon,
    streamUrl: secureStreamUrl,
    fallbackStreamUrl: raw.fallbackStreamUrl || null,
    tags,
    codec: String(raw.codec || 'MP3').toUpperCase(),
    bitrate: Number(raw.bitrate) || 128,
    homepage: raw.homepage || null,
    clickCount: Number(raw.clickcount || raw.clickCount || 0),
  };
}

async function fetchFromRadioBrowser() {
  for (const mirror of RADIO_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const url = `${mirror}/json/stations/search?has_geo_info=true&is_https=true&hidebroken=true&order=clickcount&reverse=true&limit=400`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'GodsEye/1.0 (tactical-globe-viewer)' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 20) {
          const normalized = data.map(normalizeStation).filter(Boolean);
          if (normalized.length > 20) return normalized;
        }
      }
    } catch {
      // Try next mirror
    }
  }
  return null;
}

export async function handleRadioStations(req, res, searchParams = new URLSearchParams()) {
  try {
    let stations = radioCache.get(RADIO_CACHE_KEY);

    if (!stations) {
      const upstream = await fetchFromRadioBrowser();
      if (upstream && upstream.length > 0) {
        // Merge verified fallbacks with upstream to guarantee key stations (like India AIR / SomaFM)
        const seenIds = new Set(upstream.map((s) => s.id));
        const merged = [...upstream];
        for (const vf of VERIFIED_WORLD_STATIONS) {
          if (!seenIds.has(vf.id)) {
            merged.push(vf);
          }
        }
        stations = merged;
      } else {
        stations = VERIFIED_WORLD_STATIONS;
      }
      radioCache.set(RADIO_CACHE_KEY, stations, RADIO_CACHE_TTL_MS);
    }

    // Apply optional country/tag query filtering
    let filtered = stations;
    const country = searchParams.get('country');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const limitParam = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 500;

    if (country && country !== 'all') {
      const cLower = country.toLowerCase();
      filtered = filtered.filter((s) =>
        s.countryCode?.toLowerCase() === cLower ||
        s.country?.toLowerCase() === cLower
      );
    }

    if (tag && tag !== 'all') {
      const tLower = tag.toLowerCase();
      filtered = filtered.filter((s) => s.tags?.some((t) => t.toLowerCase().includes(tLower)));
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const payload = {
      timestamp: Date.now(),
      count: Math.min(filtered.length, limit),
      totalAvailable: stations.length,
      stations: filtered.slice(0, limit),
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(JSON.stringify(payload));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Radio directory lookup failed', detail: err.message }));
  }
}

export async function handleRadioClick(req, res, uuid) {
  // Bounded non-blocking telemetry / click counter
  if (uuid) {
    for (const mirror of RADIO_MIRRORS) {
      fetch(`${mirror}/json/url/${encodeURIComponent(uuid)}`, { method: 'POST' }).catch(() => {});
      break;
    }
  }
  res.writeHead(204);
  res.end();
}
