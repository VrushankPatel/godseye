import { fetchJsonWithPolicy } from '../utils/network';

const WIKIPEDIA_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKIPEDIA_QUERY_API = 'https://en.wikipedia.org/w/api.php';
const WIKIMEDIA_COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const VISUAL_CACHE_PREFIX = 'godseye-visuals-v1:';
const VISUAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const memoryCache = new Map();

function cleanString(value) {
    return String(value || '').trim();
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function readCache(key) {
    const mem = memoryCache.get(key);
    if (mem && Date.now() - mem.cachedAt < VISUAL_CACHE_TTL_MS) {
        return mem.items;
    }

    try {
        const raw = localStorage.getItem(`${VISUAL_CACHE_PREFIX}${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.cachedAt || !Array.isArray(parsed?.items)) return null;
        if (Date.now() - parsed.cachedAt > VISUAL_CACHE_TTL_MS) return null;
        memoryCache.set(key, parsed);
        return parsed.items;
    } catch (err) {
        return null;
    }
}

function writeCache(key, items) {
    const payload = { cachedAt: Date.now(), items };
    memoryCache.set(key, payload);
    try {
        localStorage.setItem(`${VISUAL_CACHE_PREFIX}${key}`, JSON.stringify(payload));
    } catch (err) {
        // ignore cache quota/storage failures
    }
}

function buildVisualCacheKey(entity) {
    return [
        cleanString(entity?.type).toLowerCase(),
        cleanString(entity?._entityId || entity?.id || entity?.name).toLowerCase(),
        cleanString(entity?.assetType).toLowerCase(),
        cleanString(entity?.country).toLowerCase(),
        cleanString(entity?.city).toLowerCase(),
    ].join('|');
}

function extractWikipediaTitle(reference) {
    const value = cleanString(reference);
    if (!value) return '';
    try {
        const parsed = new URL(value);
        if (!parsed.hostname.includes('wikipedia.org')) return '';
        const parts = parsed.pathname.split('/wiki/');
        if (!parts[1]) return '';
        return decodeURIComponent(parts[1]).replace(/_/g, ' ');
    } catch (err) {
        return '';
    }
}

function buildSearchQueries(entity, referenceTitle) {
    const name = cleanString(entity?.name);
    const type = cleanString(entity?.assetType || entity?.type)
        .replace(/_/g, ' ')
        .replace(/\bpowergrid\b/i, 'power grid');
    const country = cleanString(entity?.country);
    const city = cleanString(entity?.city);
    const provider = cleanString(entity?.provider);

    const queries = unique([
        referenceTitle,
        [name, city, country].filter(Boolean).join(' '),
        [name, type, country].filter(Boolean).join(' '),
        [name, provider, country].filter(Boolean).join(' '),
        name,
    ]);

    return queries.filter((query) => query.length >= 4);
}

function pushVisual(items, seen, visual) {
    const url = cleanString(visual?.url);
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({
        url,
        title: cleanString(visual?.title) || 'Reference image',
        sourceUrl: cleanString(visual?.sourceUrl),
        sourceLabel: cleanString(visual?.sourceLabel) || 'Wikimedia',
    });
}

async function fetchWikipediaSummary(title) {
    const normalized = cleanString(title);
    if (!normalized) return null;

    try {
        const payload = await fetchJsonWithPolicy(
            `${WIKIPEDIA_SUMMARY_BASE}${encodeURIComponent(normalized)}`,
            {
                timeoutMs: 8000,
                retries: 0,
                circuitKey: `visuals:summary:${normalized.toLowerCase()}`,
                headers: { Accept: 'application/json' },
            }
        );
        const imageUrl = payload?.originalimage?.source || payload?.thumbnail?.source || '';
        if (!imageUrl) return null;
        return {
            url: imageUrl,
            title: payload?.title || normalized,
            sourceUrl: payload?.content_urls?.desktop?.page || '',
            sourceLabel: 'Wikipedia',
        };
    } catch (err) {
        return null;
    }
}

async function searchWikipediaTitles(query, limit = 3) {
    const value = cleanString(query);
    if (!value) return [];

    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        generator: 'search',
        gsrsearch: value,
        gsrlimit: String(limit),
        gsrnamespace: '0',
        prop: 'info',
        inprop: 'url',
    });

    try {
        const payload = await fetchJsonWithPolicy(`${WIKIPEDIA_QUERY_API}?${params.toString()}`, {
            timeoutMs: 9000,
            retries: 0,
            circuitKey: `visuals:wikipedia-search:${value.toLowerCase()}`,
        });
        return Object.values(payload?.query?.pages || {})
            .map((page) => cleanString(page?.title))
            .filter(Boolean)
            .slice(0, limit);
    } catch (err) {
        return [];
    }
}

async function searchCommonsFiles(query, limit = 4) {
    const value = cleanString(query);
    if (!value) return [];

    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        generator: 'search',
        gsrsearch: value,
        gsrlimit: String(limit),
        gsrnamespace: '6',
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: '1440',
    });

    try {
        const payload = await fetchJsonWithPolicy(`${WIKIMEDIA_COMMONS_API}?${params.toString()}`, {
            timeoutMs: 9000,
            retries: 0,
            circuitKey: `visuals:commons-search:${value.toLowerCase()}`,
        });
        return Object.values(payload?.query?.pages || {})
            .map((page) => {
                const imageInfo = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
                const imageUrl = cleanString(imageInfo?.thumburl || imageInfo?.url);
                if (!imageUrl) return null;
                return {
                    url: imageUrl,
                    title: cleanString(page?.title || value).replace(/^File:/, ''),
                    sourceUrl: cleanString(imageInfo?.descriptionurl || imageInfo?.descriptionshorturl),
                    sourceLabel: 'Wikimedia Commons',
                };
            })
            .filter(Boolean)
            .slice(0, limit);
    } catch (err) {
        return [];
    }
}

export async function discoverEntityVisuals(entity, options = {}) {
    const limit = Math.max(1, Math.min(4, Number(options?.limit) || 4));
    const cacheKey = buildVisualCacheKey(entity);
    const cached = readCache(cacheKey);
    if (cached?.length) return cached.slice(0, limit);

    const referenceTitle = extractWikipediaTitle(entity?.reference || entity?.wikipedia_link);
    const queries = buildSearchQueries(entity, referenceTitle);
    const visuals = [];
    const seen = new Set();

    if (referenceTitle) {
        const summaryVisual = await fetchWikipediaSummary(referenceTitle);
        if (summaryVisual) pushVisual(visuals, seen, summaryVisual);
        const commonsVisuals = await searchCommonsFiles(referenceTitle, limit);
        commonsVisuals.forEach((item) => pushVisual(visuals, seen, item));
    }

    for (const query of queries) {
        if (visuals.length >= limit) break;

        const pageTitles = await searchWikipediaTitles(query, 3);
        for (const title of pageTitles) {
            if (visuals.length >= limit) break;
            const summaryVisual = await fetchWikipediaSummary(title);
            if (summaryVisual) pushVisual(visuals, seen, summaryVisual);
        }

        if (visuals.length >= limit) break;
        const commonsVisuals = await searchCommonsFiles(query, limit - visuals.length);
        commonsVisuals.forEach((item) => pushVisual(visuals, seen, item));
    }

    writeCache(cacheKey, visuals);
    return visuals.slice(0, limit);
}
