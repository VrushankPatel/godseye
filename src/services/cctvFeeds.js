export function parseJsonPayload(payload) {
    if (!payload) return null;
    if (typeof payload === 'string') {
        try {
            return JSON.parse(payload);
        } catch {
            return null;
        }
    }
    return payload;
}

export function splitCatalogPayload(payload) {
    return String(payload || '')
        .split(/[^\x20-\x7E]+/)
        .map((part) => part.trim())
        .filter(Boolean);
}

export function inferMediaTypeFromUrls({ url, videoUrl }) {
    const combined = `${videoUrl || ''} ${url || ''}`.toLowerCase();
    if (!combined.trim()) return 'image';
    if (combined.includes('.m3u8') || combined.includes('.mp4') || combined.includes('.webm')) {
        return 'video';
    }
    if (
        combined.includes('.htm') ||
        combined.includes('.html') ||
        combined.includes('youtube.com/embed') ||
        combined.includes('player?url=')
    ) {
        return 'embed';
    }
    return 'image';
}

export function normalizeCaltransFeed(text, maxFeeds = Infinity) {
    const feeds = [];
    const seen = new Set();
    const lines = String(text || '').split('\n');

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line.startsWith('cctv[')) continue;
        const payloadMatch = line.match(/=\s*'(.*)';$/);
        if (!payloadMatch) continue;
        const parts = splitCatalogPayload(payloadMatch[1]);
        if (parts.length < 4) continue;

        const pageUrl = parts[0];
        const lng = Number(parts[1]);
        const lat = Number(parts[2]);
        const name = parts[3] || `Caltrans Camera ${i + 1}`;
        const streamFlag = String(parts[4] || '0').trim();
        const streamCapable = streamFlag === '1';

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !pageUrl.startsWith('https://')) continue;

        const locMatch = pageUrl.match(/\/vm\/loc\/([^/]+)\/([^/.]+)\.htm$/i);
        const district = locMatch?.[1] || 'd0';
        const slug = locMatch?.[2] || `cam-${i + 1}`;
        const key = `${district}-${slug}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const stillImageUrl = `https://cwwp2.dot.ca.gov/data/${district}/cctv/image/${slug}/${slug}.jpg`;
        feeds.push({
            id: `caltrans-${key}`,
            name,
            lat,
            lng,
            url: stillImageUrl,
            videoUrl: streamCapable ? pageUrl : null,
            fallbackUrl: stillImageUrl,
            detailsUrl: pageUrl,
            city: 'California',
            mediaType: streamCapable ? 'caltrans' : 'image',
            streamCapable,
            refreshSeconds: 5,
            provider: 'Caltrans',
        });
        if (feeds.length >= maxFeeds) break;
    }

    return feeds;
}

export function normalize511Feeds(payload, provider, region, maxFeeds = Infinity, originBase = '') {
    const parsed = parseJsonPayload(payload);
    if (!Array.isArray(parsed)) return [];

    const feeds = [];
    const normalizedBase = String(originBase || '').replace(/\/$/, '');

    for (const cam of parsed) {
        const lat = Number(cam?.Latitude);
        const lng = Number(cam?.Longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const firstView = Array.isArray(cam.Views)
            ? cam.Views.find((view) => view && view.Status === 'Enabled' && view.Url)
            : null;
        if (!firstView) continue;

        const viewUrl = firstView.Url.startsWith('http')
            ? firstView.Url
            : `${normalizedBase}${firstView.Url.startsWith('/') ? '' : '/'}${firstView.Url}`;

        feeds.push({
            id: `${provider.toLowerCase().replace(/\s+/g, '-')}-${cam.Id}-${firstView.Id || 'main'}`,
            name: cam.Location || `${cam.Roadway || 'Road'} ${cam.Direction || ''}`.trim(),
            lat,
            lng,
            url: viewUrl,
            fallbackUrl: viewUrl,
            city: region,
            mediaType: inferMediaTypeFromUrls({ url: viewUrl, videoUrl: '' }),
            refreshSeconds: 5,
            provider,
        });
        if (feeds.length >= maxFeeds) break;
    }

    return feeds;
}

export function normalizeTflFeeds(payload, maxFeeds = Infinity) {
    const parsed = parseJsonPayload(payload);
    if (!Array.isArray(parsed)) return [];

    const feeds = [];
    for (const cam of parsed) {
        const lat = Number(cam?.lat);
        const lng = Number(cam?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const metadata = {};
        if (Array.isArray(cam.additionalProperties)) {
            cam.additionalProperties.forEach((entry) => {
                if (entry?.key) metadata[entry.key] = entry.value;
            });
        }

        const imageUrl = metadata.imageUrl || '';
        const videoUrl = metadata.videoUrl || '';
        const primaryUrl = imageUrl || videoUrl;
        if (!primaryUrl) continue;

        feeds.push({
            id: `tfl-${cam.id || cam.commonName || feeds.length}`,
            name: cam.commonName || metadata.view || 'TfL JamCam',
            lat,
            lng,
            url: primaryUrl,
            videoUrl: videoUrl || null,
            fallbackUrl: imageUrl || null,
            city: 'London',
            mediaType: inferMediaTypeFromUrls({ url: imageUrl, videoUrl }),
            refreshSeconds: 5,
            provider: 'TfL JamCams',
        });
        if (feeds.length >= maxFeeds) break;
    }

    return feeds;
}

export function mergeFeeds(feedGroups) {
    const merged = [];
    const seen = new Set();

    for (const group of feedGroups) {
        for (const feed of group || []) {
            if (!feed || !Number.isFinite(feed.lat) || !Number.isFinite(feed.lng)) continue;
            const key = `${feed.provider || 'pub'}:${feed.id || ''}:${feed.lat.toFixed(4)}:${feed.lng.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(feed);
        }
    }

    return merged;
}

export function getCameraPriority(feed) {
    let score = 0;
    if (feed?.verificationStatus === 'verified') score += 35;
    if (feed?.verificationStatus === 'catalog_verified') score += 24;
    if (feed?.videoUrl) score += 50;
    if (feed?.resolvedVideoUrl) score += 22;
    if (feed?.streamCapable) score += 20;
    if (feed?.mediaType === 'video') score += 25;
    if (feed?.mediaType === 'embed') score += 18;
    if (feed?.provider === 'YouTube Live') score += 12;
    if (feed?.provider === 'TfL JamCams') score += 10;
    return score;
}

export function prioritizeFeeds(feeds) {
    return [...(feeds || [])].sort((a, b) => getCameraPriority(b) - getCameraPriority(a));
}

export function extractCaltransStreamUrl(html) {
    if (!html) return '';
    const match = String(html).match(/var\s+videoStreamURL\s*=\s*"([^"]+)"/i);
    return match?.[1] || '';
}
