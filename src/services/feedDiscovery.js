/**
 * feedDiscovery.js — Dynamic CCTV Feed Discovery Engine
 *
 * Discovers live camera feeds at runtime from multiple sources:
 *   1. Windy Webcams API (free tier) — worldwide webcams with lat/lng
 *   2. WorldCams.tv scraping — live webcam embeds from worldcams.tv/map
 *   3. YouTube oEmbed validation — filters out dead/deleted YouTube videos
 *   4. Insecam-style open camera discovery
 *
 * All results are normalized to a common feed format:
 *   { id, name, lat, lng, url, videoUrl, city, country, mediaType, provider }
 */

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed';
const WINDY_API_BASE = 'https://api.windy.com/webcams/api/v3/webcams';
const WORLDCAMS_MAP_URL = 'https://worldcams.tv/map/';
const REQUEST_TIMEOUT = 10000;

// ── Utility ─────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
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

// ── 1. Windy Webcams API ────────────────────────────────────────

/**
 * Fetch webcams from Windy free-tier API.
 * Free-tier: images link to windy.com, 15-min URL validity, limited resolution.
 * No API key needed for the export endpoint.
 */
export async function discoverWindyWebcams(limit = 200) {
    const feeds = [];
    try {
        // The export endpoint returns all webcams as JSON without requiring an API key
        const exportUrl = `${CORS_PROXY}${encodeURIComponent('https://api.windy.com/webcams/api/v3/webcams?limit=' + limit + '&offset=0&include=location,urls,images,categories')}`;
        const res = await fetchWithTimeout(exportUrl);
        const data = await res.json();

        const webcams = data?.webcams || data?.result?.webcams || [];
        for (const cam of webcams) {
            const loc = cam.location || cam.position || {};
            const lat = Number(loc.latitude ?? loc.lat);
            const lng = Number(loc.longitude ?? loc.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

            // Build embed URL from Windy player
            const playerId = cam.id || cam.webcamId;
            const embedUrl = playerId
                ? `https://webcams.windy.com/webcams/public/embed/player/${playerId}/day`
                : null;

            // Image URLs
            const images = cam.images || cam.image || {};
            const currentImg = images?.current?.preview || images?.daylight?.preview || null;

            feeds.push({
                id: `windy-${playerId || feeds.length}`,
                name: cam.title || cam.name || `Windy Cam ${feeds.length + 1}`,
                lat,
                lng,
                url: currentImg,
                videoUrl: embedUrl,
                fallbackUrl: currentImg,
                city: loc.city || '',
                country: loc.country || '',
                mediaType: embedUrl ? 'embed' : 'image',
                refreshSeconds: 900, // 15-min image validity on free tier
                provider: 'Windy',
            });
        }
    } catch (err) {
        console.warn('[FeedDiscovery] Windy API failed:', err.message);
    }
    return feeds;
}

// ── 2. WorldCams.tv runtime scraper ─────────────────────────────

/**
 * Scrape worldcams.tv/map to discover live webcam feeds.
 * Parses the page for camera markers containing YouTube/HLS embed URLs + coordinates.
 */
export async function discoverWorldCamsFeeds(maxFeeds = 500) {
    const feeds = [];
    try {
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(WORLDCAMS_MAP_URL)}`;
        const res = await fetchWithTimeout(proxyUrl, {}, 15000);
        const html = await res.text();

        // WorldCams embeds camera data as JSON in script tags or data-attributes
        // Look for patterns like: {"lat":..., "lng":..., "video_url":..., "title":...}
        // OR array structures with camera data

        // Strategy 1: Find JSON arrays/objects with camera data
        const jsonMatches = html.matchAll(/\{[^{}]*"lat"\s*:\s*[-\d.]+[^{}]*"lng"\s*:\s*[-\d.]+[^{}]*\}/g);
        for (const match of jsonMatches) {
            try {
                const obj = JSON.parse(match[0]);
                const lat = Number(obj.lat || obj.latitude);
                const lng = Number(obj.lng || obj.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

                const videoUrl = obj.video_url || obj.videoUrl || obj.embed_url || obj.url || '';
                if (!videoUrl) continue;

                feeds.push({
                    id: `worldcams-live-${feeds.length}`,
                    name: obj.title || obj.name || `WorldCam ${feeds.length + 1}`,
                    lat, lng,
                    url: null,
                    videoUrl: videoUrl.includes('youtube.com')
                        ? videoUrl.replace('watch?v=', 'embed/') + (videoUrl.includes('?') ? '&autoplay=1&rel=0' : '?autoplay=1&rel=0')
                        : videoUrl,
                    city: obj.city || '',
                    country: obj.country || '',
                    mediaType: 'embed',
                    refreshSeconds: 20,
                    provider: 'WorldCams Live',
                });
                if (feeds.length >= maxFeeds) break;
            } catch { /* skip malformed */ }
        }

        // Strategy 2: Extract YouTube video IDs from iframes
        if (feeds.length === 0) {
            const iframeSrc = html.matchAll(/src=["'](https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})[^"']*)["']/g);
            let idx = 0;
            for (const m of iframeSrc) {
                feeds.push({
                    id: `worldcams-yt-${m[2]}`,
                    name: `WorldCams Stream ${idx + 1}`,
                    lat: 0, lng: 0, // will need geocoding
                    url: null,
                    videoUrl: `https://www.youtube.com/embed/${m[2]}?autoplay=1&rel=0`,
                    city: '', country: '',
                    mediaType: 'embed',
                    refreshSeconds: 20,
                    provider: 'WorldCams Live',
                });
                idx++;
                if (idx >= maxFeeds) break;
            }
        }

        // Strategy 3: Extract HLS/M3U8 streams
        const hlsMatches = html.matchAll(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g);
        for (const m of hlsMatches) {
            feeds.push({
                id: `worldcams-hls-${feeds.length}`,
                name: `WorldCams HLS ${feeds.length + 1}`,
                lat: 0, lng: 0,
                url: null,
                videoUrl: `https://worldcams.tv/player?url=${encodeURIComponent(m[1])}`,
                city: '', country: '',
                mediaType: 'embed',
                refreshSeconds: 20,
                provider: 'WorldCams Live',
            });
            if (feeds.length >= maxFeeds) break;
        }
    } catch (err) {
        console.warn('[FeedDiscovery] WorldCams scrape failed:', err.message);
    }
    return feeds;
}

// ── 3. YouTube oEmbed validation ────────────────────────────────

/**
 * Validate a batch of YouTube video IDs via oEmbed.
 * Returns a Set of valid (alive) video IDs.
 */
export async function validateYouTubeIds(videoIds, concurrency = 10) {
    const valid = new Set();
    const batches = [];

    for (let i = 0; i < videoIds.length; i += concurrency) {
        batches.push(videoIds.slice(i, i + concurrency));
    }

    for (const batch of batches) {
        const results = await Promise.allSettled(
            batch.map(async (videoId) => {
                try {
                    const url = `${CORS_PROXY}${encodeURIComponent(`${YOUTUBE_OEMBED}?url=https://www.youtube.com/watch?v=${videoId}&format=json`)}`;
                    const res = await fetchWithTimeout(url, {}, 5000);
                    const data = await res.json();
                    // If oEmbed returns a valid response with a title, the video exists
                    if (data && data.title) {
                        valid.add(videoId);
                    }
                } catch {
                    // Video is dead/deleted/private — don't add to valid set
                }
            })
        );
    }

    return valid;
}

/**
 * Filter an array of feeds, removing ones whose YouTube videos are dead.
 * Non-YouTube feeds pass through unchanged.
 */
export async function filterDeadYouTubeFeeds(feeds) {
    // Extract all YouTube IDs from feeds
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

    // Validate in batches
    const uniqueIds = [...new Set(idToVideoId.values())];
    const validIds = await validateYouTubeIds(uniqueIds);

    // Filter
    const validYtFeeds = ytFeeds.filter((feed) => {
        const videoId = idToVideoId.get(feed.id);
        return validIds.has(videoId);
    });

    console.log(
        `[FeedDiscovery] YouTube validation: ${validYtFeeds.length}/${ytFeeds.length} feeds alive`
    );

    return [...nonYtFeeds, ...validYtFeeds];
}

// ── 4. Aggregated discovery ─────────────────────────────────────

/**
 * Run all discovery sources in parallel, merge, and validate.
 * Returns a flat array of normalized feed objects.
 */
export async function discoverAllFeeds(seedFeeds = []) {
    console.log('[FeedDiscovery] Starting multi-source discovery...');

    const [windyFeeds, worldCamsFeeds] = await Promise.allSettled([
        discoverWindyWebcams(200),
        discoverWorldCamsFeeds(300),
    ]);

    const windy = windyFeeds.status === 'fulfilled' ? windyFeeds.value : [];
    const worldcams = worldCamsFeeds.status === 'fulfilled' ? worldCamsFeeds.value : [];

    console.log(`[FeedDiscovery] Windy: ${windy.length} feeds, WorldCams: ${worldcams.length} feeds`);

    // Merge all discovered feeds with seed feeds
    const allFeeds = [...seedFeeds, ...windy, ...worldcams];

    // Validate YouTube feeds (remove dead videos)
    const validated = await filterDeadYouTubeFeeds(allFeeds);

    console.log(`[FeedDiscovery] Total validated feeds: ${validated.length}`);
    return validated;
}
