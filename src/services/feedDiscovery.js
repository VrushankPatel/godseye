/**
 * feedDiscovery.js — Dynamic CCTV Feed Discovery Engine
 *
 * Discovers live camera feeds at runtime from multiple sources:
 *   1. YouTube Data API v3 — searches for live CCTV/webcam streams globally
 *   2. Windy Webcams API — worldwide webcams with lat/lng
 *   3. YouTube oEmbed validation — filters out dead/deleted YouTube videos
 *
 * All results normalized to:
 *   { id, name, lat, lng, url, videoUrl, city, country, mediaType, provider }
 */

import { getRuntimeKey } from '../utils/runtimeEnv';

const YOUTUBE_API_KEY = getRuntimeKey('VITE_YOUTUBE_API_KEY', ' YouTube live CCTV discovery');
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const REQUEST_TIMEOUT = 10000;

// ── Built-in geocoder for location extraction from video titles ──

const LOCATION_DB = {
    // India
    'mumbai': { lat: 19.0760, lng: 72.8777, country: 'India' },
    'delhi': { lat: 28.6139, lng: 77.2090, country: 'India' },
    'new delhi': { lat: 28.6139, lng: 77.2090, country: 'India' },
    'bangalore': { lat: 12.9716, lng: 77.5946, country: 'India' },
    'bengaluru': { lat: 12.9716, lng: 77.5946, country: 'India' },
    'chennai': { lat: 13.0827, lng: 80.2707, country: 'India' },
    'kolkata': { lat: 22.5726, lng: 88.3639, country: 'India' },
    'hyderabad': { lat: 17.3850, lng: 78.4867, country: 'India' },
    'pune': { lat: 18.5204, lng: 73.8567, country: 'India' },
    'ahmedabad': { lat: 23.0225, lng: 72.5714, country: 'India' },
    'jaipur': { lat: 26.9124, lng: 75.7873, country: 'India' },
    'varanasi': { lat: 25.3176, lng: 82.9739, country: 'India' },
    'tirupati': { lat: 13.6288, lng: 79.4192, country: 'India' },
    'goa': { lat: 15.2993, lng: 74.1240, country: 'India' },
    'kochi': { lat: 9.9312, lng: 76.2673, country: 'India' },
    'lucknow': { lat: 26.8467, lng: 80.9462, country: 'India' },
    'agra': { lat: 27.1767, lng: 78.0081, country: 'India' },
    'surat': { lat: 21.1702, lng: 72.8311, country: 'India' },
    'chandigarh': { lat: 30.7333, lng: 76.7794, country: 'India' },
    'india': { lat: 20.5937, lng: 78.9629, country: 'India' },
    // Japan
    'tokyo': { lat: 35.6762, lng: 139.6503, country: 'Japan' },
    'shibuya': { lat: 35.6595, lng: 139.7004, country: 'Japan' },
    'shinjuku': { lat: 35.6938, lng: 139.7034, country: 'Japan' },
    'osaka': { lat: 34.6937, lng: 135.5023, country: 'Japan' },
    'kyoto': { lat: 35.0116, lng: 135.7681, country: 'Japan' },
    'yokohama': { lat: 35.4437, lng: 139.6380, country: 'Japan' },
    'fukuoka': { lat: 33.5904, lng: 130.4017, country: 'Japan' },
    'sapporo': { lat: 43.0618, lng: 141.3545, country: 'Japan' },
    'japan': { lat: 36.2048, lng: 138.2529, country: 'Japan' },
    // USA
    'new york': { lat: 40.7128, lng: -74.0060, country: 'USA' },
    'nyc': { lat: 40.7128, lng: -74.0060, country: 'USA' },
    'manhattan': { lat: 40.7831, lng: -73.9712, country: 'USA' },
    'times square': { lat: 40.7580, lng: -73.9855, country: 'USA' },
    'los angeles': { lat: 34.0522, lng: -118.2437, country: 'USA' },
    'hollywood': { lat: 34.0928, lng: -118.3287, country: 'USA' },
    'las vegas': { lat: 36.1699, lng: -115.1398, country: 'USA' },
    'miami': { lat: 25.7617, lng: -80.1918, country: 'USA' },
    'chicago': { lat: 41.8781, lng: -87.6298, country: 'USA' },
    'san francisco': { lat: 37.7749, lng: -122.4194, country: 'USA' },
    'seattle': { lat: 47.6062, lng: -122.3321, country: 'USA' },
    'boston': { lat: 42.3601, lng: -71.0589, country: 'USA' },
    'houston': { lat: 29.7604, lng: -95.3698, country: 'USA' },
    'dallas': { lat: 32.7767, lng: -96.7970, country: 'USA' },
    'denver': { lat: 39.7392, lng: -104.9903, country: 'USA' },
    'phoenix': { lat: 33.4484, lng: -112.0740, country: 'USA' },
    'venice beach': { lat: 33.9850, lng: -118.4695, country: 'USA' },
    'hawaii': { lat: 19.8968, lng: -155.5828, country: 'USA' },
    'waikiki': { lat: 21.2769, lng: -157.8268, country: 'USA' },
    // Europe
    'london': { lat: 51.5074, lng: -0.1278, country: 'UK' },
    'paris': { lat: 48.8566, lng: 2.3522, country: 'France' },
    'berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany' },
    'rome': { lat: 41.9028, lng: 12.4964, country: 'Italy' },
    'madrid': { lat: 40.4168, lng: -3.7038, country: 'Spain' },
    'barcelona': { lat: 41.3874, lng: 2.1686, country: 'Spain' },
    'amsterdam': { lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
    'prague': { lat: 50.0755, lng: 14.4378, country: 'Czech Republic' },
    'vienna': { lat: 48.2082, lng: 16.3738, country: 'Austria' },
    'zurich': { lat: 47.3769, lng: 8.5417, country: 'Switzerland' },
    'stockholm': { lat: 59.3293, lng: 18.0686, country: 'Sweden' },
    'oslo': { lat: 59.9139, lng: 10.7522, country: 'Norway' },
    'copenhagen': { lat: 55.6761, lng: 12.5683, country: 'Denmark' },
    'dublin': { lat: 53.3498, lng: -6.2603, country: 'Ireland' },
    'lisbon': { lat: 38.7223, lng: -9.1393, country: 'Portugal' },
    'athens': { lat: 37.9838, lng: 23.7275, country: 'Greece' },
    'istanbul': { lat: 41.0082, lng: 28.9784, country: 'Turkey' },
    'moscow': { lat: 55.7558, lng: 37.6173, country: 'Russia' },
    'warsaw': { lat: 52.2297, lng: 21.0122, country: 'Poland' },
    'budapest': { lat: 47.4979, lng: 19.0402, country: 'Hungary' },
    // Middle East
    'dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE' },
    'abu dhabi': { lat: 24.4539, lng: 54.3773, country: 'UAE' },
    'doha': { lat: 25.2854, lng: 51.5310, country: 'Qatar' },
    'riyadh': { lat: 24.7136, lng: 46.6753, country: 'Saudi Arabia' },
    'mecca': { lat: 21.3891, lng: 39.8579, country: 'Saudi Arabia' },
    'medina': { lat: 24.5247, lng: 39.5692, country: 'Saudi Arabia' },
    'jerusalem': { lat: 31.7683, lng: 35.2137, country: 'Israel' },
    'tel aviv': { lat: 32.0853, lng: 34.7818, country: 'Israel' },
    // Asia
    'seoul': { lat: 37.5665, lng: 126.9780, country: 'South Korea' },
    'busan': { lat: 35.1796, lng: 129.0756, country: 'South Korea' },
    'beijing': { lat: 39.9042, lng: 116.4074, country: 'China' },
    'shanghai': { lat: 31.2304, lng: 121.4737, country: 'China' },
    'hong kong': { lat: 22.3193, lng: 114.1694, country: 'China' },
    'taipei': { lat: 25.0330, lng: 121.5654, country: 'Taiwan' },
    'singapore': { lat: 1.3521, lng: 103.8198, country: 'Singapore' },
    'bangkok': { lat: 13.7563, lng: 100.5018, country: 'Thailand' },
    'manila': { lat: 14.5995, lng: 120.9842, country: 'Philippines' },
    'kuala lumpur': { lat: 3.1390, lng: 101.6869, country: 'Malaysia' },
    'jakarta': { lat: -6.2088, lng: 106.8456, country: 'Indonesia' },
    'hanoi': { lat: 21.0285, lng: 105.8542, country: 'Vietnam' },
    // Australia / Oceania
    'sydney': { lat: -33.8688, lng: 151.2093, country: 'Australia' },
    'melbourne': { lat: -37.8136, lng: 144.9631, country: 'Australia' },
    'brisbane': { lat: -27.4698, lng: 153.0251, country: 'Australia' },
    'perth': { lat: -31.9505, lng: 115.8605, country: 'Australia' },
    'auckland': { lat: -36.8485, lng: 174.7633, country: 'New Zealand' },
    // South America
    'rio de janeiro': { lat: -22.9068, lng: -43.1729, country: 'Brazil' },
    'sao paulo': { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
    'buenos aires': { lat: -34.6037, lng: -58.3816, country: 'Argentina' },
    'bogota': { lat: 4.7110, lng: -74.0721, country: 'Colombia' },
    'lima': { lat: -12.0464, lng: -77.0428, country: 'Peru' },
    'santiago': { lat: -33.4489, lng: -70.6693, country: 'Chile' },
    // Africa
    'cairo': { lat: 30.0444, lng: 31.2357, country: 'Egypt' },
    'cape town': { lat: -33.9249, lng: 18.4241, country: 'South Africa' },
    'nairobi': { lat: -1.2921, lng: 36.8219, country: 'Kenya' },
    'lagos': { lat: 6.5244, lng: 3.3792, country: 'Nigeria' },
    // Canada
    'toronto': { lat: 43.6532, lng: -79.3832, country: 'Canada' },
    'vancouver': { lat: 49.2827, lng: -123.1207, country: 'Canada' },
    'montreal': { lat: 45.5017, lng: -73.5673, country: 'Canada' },
    'niagara': { lat: 43.0896, lng: -79.0849, country: 'Canada' },
    'niagara falls': { lat: 43.0896, lng: -79.0849, country: 'Canada' },
};

// Search queries — each targets a different region/theme for diverse global coverage
const YOUTUBE_SEARCH_QUERIES = [
    'live webcam city',
    'live CCTV India',
    'live webcam Japan Tokyo',
    'live camera USA city',
    'live webcam Europe',
    'live camera Dubai',
    'live webcam Seoul Korea',
    'live camera Sydney Australia',
    'live webcam beach',
    'live traffic camera',
    'live stream city skyline',
    'live webcam airport',
    'live camera London',
    'live CCTV street',
    'live webcam Thailand Bangkok',
    'live camera Singapore',
    '24/7 live webcam',
    'live webcam Russia Moscow',
    'live camera Brazil Rio',
    'live stream temple India',
];

// ── Utility ─────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    } finally {
        clearTimeout(id);
    }
}

function extractYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

/**
 * Extract location from a video title by matching against our built-in location DB.
 * Returns { lat, lng, city, country } or null.
 */
function geolocateFromTitle(title) {
    if (!title) return null;
    const lower = title.toLowerCase();

    // Try longest matches first (e.g. "new york" before "york")
    const sortedKeys = Object.keys(LOCATION_DB).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (lower.includes(key)) {
            const loc = LOCATION_DB[key];
            // Add small random offset so overlapping pins don't stack exactly
            const jitter = () => (Math.random() - 0.5) * 0.05;
            return {
                lat: loc.lat + jitter(),
                lng: loc.lng + jitter(),
                city: key.charAt(0).toUpperCase() + key.slice(1),
                country: loc.country,
            };
        }
    }
    return null;
}

// ── 1. YouTube Data API v3 — Live Stream Search ─────────────────

/**
 * Search YouTube for live CCTV/webcam streams using the Data API v3.
 * Runs multiple search queries in parallel for global coverage.
 */
export async function discoverYouTubeLiveFeeds(maxPerQuery = 15) {
    if (!YOUTUBE_API_KEY) return [];

    const feeds = [];
    const seenVideoIds = new Set();

    console.log(`[FeedDiscovery] Searching YouTube for live feeds across ${YOUTUBE_SEARCH_QUERIES.length} queries...`);

    // Run all queries in parallel (each costs 100 quota units)
    const results = await Promise.allSettled(
        YOUTUBE_SEARCH_QUERIES.map(async (query) => {
            const params = new URLSearchParams({
                part: 'snippet',
                q: query,
                type: 'video',
                eventType: 'live',          // Only live streams!
                maxResults: String(maxPerQuery),
                order: 'viewCount',         // Prefer popular streams
                key: YOUTUBE_API_KEY,
            });
            const url = `${YOUTUBE_SEARCH_URL}?${params}`;
            const res = await fetchWithTimeout(url, {}, 8000);
            return res.json();
        })
    );

    for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value?.items) continue;

        for (const item of result.value.items) {
            const videoId = item.id?.videoId;
            if (!videoId || seenVideoIds.has(videoId)) continue;
            seenVideoIds.add(videoId);

            const title = item.snippet?.title || '';
            const description = item.snippet?.description || '';
            const channelTitle = item.snippet?.channelTitle || '';

            // Try to geolocate from title, description, or channel name
            const geo = geolocateFromTitle(title)
                || geolocateFromTitle(description)
                || geolocateFromTitle(channelTitle);

            if (!geo) continue; // Skip if we can't place it on the map

            feeds.push({
                id: `yt-live-${videoId}`,
                name: title,
                lat: geo.lat,
                lng: geo.lng,
                url: null,
                videoUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
                fallbackUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                city: geo.city,
                country: geo.country,
                mediaType: 'embed',
                refreshSeconds: 30,
                provider: 'YouTube Live',
                isLive: true,
                channelTitle,
            });
        }
    }

    console.log(`[FeedDiscovery] YouTube API: found ${feeds.length} geolocatable live streams from ${seenVideoIds.size} total results`);
    return feeds;
}

// ── 2. Windy Webcams API ────────────────────────────────────────

export async function discoverWindyWebcams(limit = 200) {
    const feeds = [];
    try {
        const exportUrl = `${CORS_PROXY}${encodeURIComponent('https://api.windy.com/webcams/api/v3/webcams?limit=' + limit + '&offset=0&include=location,urls,images,categories')}`;
        const res = await fetchWithTimeout(exportUrl);
        const data = await res.json();

        const webcams = data?.webcams || data?.result?.webcams || [];
        for (const cam of webcams) {
            const loc = cam.location || cam.position || {};
            const lat = Number(loc.latitude ?? loc.lat);
            const lng = Number(loc.longitude ?? loc.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

            const playerId = cam.id || cam.webcamId;
            const embedUrl = playerId
                ? `https://webcams.windy.com/webcams/public/embed/player/${playerId}/day`
                : null;

            const images = cam.images || cam.image || {};
            const currentImg = images?.current?.preview || images?.daylight?.preview || null;

            feeds.push({
                id: `windy-${playerId || feeds.length}`,
                name: cam.title || cam.name || `Windy Cam ${feeds.length + 1}`,
                lat, lng,
                url: currentImg,
                videoUrl: embedUrl,
                fallbackUrl: currentImg,
                city: loc.city || '',
                country: loc.country || '',
                mediaType: embedUrl ? 'embed' : 'image',
                refreshSeconds: 900,
                provider: 'Windy',
            });
        }
    } catch (err) {
        console.warn('[FeedDiscovery] Windy API failed:', err.message);
    }
    return feeds;
}

// ── 3. YouTube oEmbed validation ────────────────────────────────

/**
 * Validate a batch of YouTube video IDs via oEmbed.
 * Returns a Set of valid (alive) video IDs.
 */
export async function validateYouTubeIds(videoIds, concurrency = 15) {
    const valid = new Set();
    const batches = [];

    for (let i = 0; i < videoIds.length; i += concurrency) {
        batches.push(videoIds.slice(i, i + concurrency));
    }

    for (const batch of batches) {
        await Promise.allSettled(
            batch.map(async (videoId) => {
                try {
                    const url = `${CORS_PROXY}${encodeURIComponent(`${YOUTUBE_OEMBED}?url=https://www.youtube.com/watch?v=${videoId}&format=json`)}`;
                    const res = await fetchWithTimeout(url, {}, 5000);
                    const data = await res.json();
                    if (data && data.title) {
                        valid.add(videoId);
                    }
                } catch { /* dead video */ }
            })
        );
    }

    return valid;
}

/**
 * Filter feeds, removing YouTube videos that are dead/deleted/private.
 * Non-YouTube feeds pass through unchanged.
 */
export async function filterDeadYouTubeFeeds(feeds, sampleSize = 50) {
    const ytFeeds = [];
    const nonYtFeeds = [];
    const idToVideoId = new Map();

    for (const feed of feeds) {
        const videoId = extractYouTubeId(feed.videoUrl);
        if (videoId) {
            ytFeeds.push(feed);
            idToVideoId.set(feed.id, videoId);
        } else {
            nonYtFeeds.push(feed);
        }
    }

    if (ytFeeds.length === 0) return feeds;

    // Sample validation — check a random subset to avoid quota exhaustion
    const uniqueIds = [...new Set(idToVideoId.values())];
    const toValidate = uniqueIds.length > sampleSize
        ? uniqueIds.sort(() => Math.random() - 0.5).slice(0, sampleSize)
        : uniqueIds;

    const validIds = await validateYouTubeIds(toValidate);

    // Keep YT feeds whose ID was validated OR wasn't in the sample
    const checkedSet = new Set(toValidate);
    const validYtFeeds = ytFeeds.filter((feed) => {
        const videoId = idToVideoId.get(feed.id);
        if (!checkedSet.has(videoId)) return true; // wasn't checked, keep it
        return validIds.has(videoId);               // was checked, keep only if valid
    });

    console.log(
        `[FeedDiscovery] YouTube validation: ${validIds.size}/${toValidate.length} sampled feeds alive, kept ${validYtFeeds.length}/${ytFeeds.length} total`
    );

    return [...nonYtFeeds, ...validYtFeeds];
}

// ── 4. Aggregated discovery ─────────────────────────────────────

/**
 * Run all discovery sources in parallel, merge, and return.
 * This is called as Phase 2 by CameraLayer.
 */
export async function discoverAllFeeds(seedFeeds = []) {
    console.log('[FeedDiscovery] Starting multi-source discovery...');

    const [ytResult, windyResult] = await Promise.allSettled([
        discoverYouTubeLiveFeeds(15),
        discoverWindyWebcams(200),
    ]);

    const ytFeeds = ytResult.status === 'fulfilled' ? ytResult.value : [];
    const windyFeeds = windyResult.status === 'fulfilled' ? windyResult.value : [];

    console.log(`[FeedDiscovery] YouTube Live: ${ytFeeds.length}, Windy: ${windyFeeds.length}`);

    // Merge discovered feeds with seed feeds
    const allFeeds = [...seedFeeds, ...ytFeeds, ...windyFeeds];

    console.log(`[FeedDiscovery] Total discovered feeds: ${allFeeds.length}`);
    return allFeeds;
}
