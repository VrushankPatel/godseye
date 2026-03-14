import { classifyIntelSeverity } from '../services/intelMonitor';

export const RELAY_TOPIC_CACHE_KEY = 'godseye:relay-topics-cache:v1';
export const RELAY_TOPIC_CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

export const NEWS_RELAY_FALLBACK_TOPICS = [
    { id: 'breaking', label: 'BREAKING', channelGroups: ['breaking'] },
    { id: 'mideast', label: 'MIDEAST', channelGroups: ['mideast', 'breaking'] },
    { id: 'europe', label: 'EUROPE', channelGroups: ['europe', 'breaking'] },
    { id: 'asia', label: 'ASIA', channelGroups: ['asia', 'breaking'] },
    { id: 'business', label: 'BUSINESS', channelGroups: ['business', 'breaking'] },
];

function buildYouTubeEmbedUrl(videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;
}

function buildYouTubeWatchUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

function buildYouTubePreviewUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export const CURATED_NEWS_STREAMS = [
    {
        id: 'bloomberg',
        name: 'Bloomberg',
        provider: 'Bloomberg Television',
        type: 'youtube',
        videoId: 'iEpJwprxDdk',
        streamUrl: buildYouTubeEmbedUrl('iEpJwprxDdk'),
        sourceUrl: buildYouTubeWatchUrl('iEpJwprxDdk'),
        previewUrl: buildYouTubePreviewUrl('iEpJwprxDdk'),
        groups: ['breaking', 'business'],
        note: 'Markets, macro, and global breaking coverage.',
        language: 'EN',
        priority: 100,
    },
    {
        id: 'dw-news',
        name: 'DW',
        provider: 'DW News',
        type: 'youtube',
        videoId: 'LuKwFajn37U',
        streamUrl: buildYouTubeEmbedUrl('LuKwFajn37U'),
        sourceUrl: buildYouTubeWatchUrl('LuKwFajn37U'),
        previewUrl: buildYouTubePreviewUrl('LuKwFajn37U'),
        groups: ['breaking', 'europe'],
        note: 'European and global headline stream.',
        language: 'EN',
        priority: 96,
    },
    {
        id: 'euronews',
        name: 'Euronews',
        provider: 'euronews',
        type: 'youtube',
        videoId: 'pykpO5kQJ98',
        streamUrl: buildYouTubeEmbedUrl('pykpO5kQJ98'),
        sourceUrl: buildYouTubeWatchUrl('pykpO5kQJ98'),
        previewUrl: buildYouTubePreviewUrl('pykpO5kQJ98'),
        groups: ['breaking', 'europe'],
        note: 'Pan-European live newsroom.',
        language: 'EN',
        priority: 94,
    },
    {
        id: 'france24-en',
        name: 'France 24',
        provider: 'FRANCE 24 English',
        type: 'youtube',
        videoId: 'Ap-UM1O9RBU',
        streamUrl: buildYouTubeEmbedUrl('Ap-UM1O9RBU'),
        sourceUrl: buildYouTubeWatchUrl('Ap-UM1O9RBU'),
        previewUrl: buildYouTubePreviewUrl('Ap-UM1O9RBU'),
        groups: ['breaking', 'europe', 'mideast'],
        note: 'International live desk with Europe and MENA coverage.',
        language: 'EN',
        priority: 92,
    },
    {
        id: 'aljazeera-english',
        name: 'Al Jazeera',
        provider: 'Al Jazeera English',
        type: 'youtube',
        videoId: 'gCNeDWCI0vo',
        streamUrl: buildYouTubeEmbedUrl('gCNeDWCI0vo'),
        sourceUrl: buildYouTubeWatchUrl('gCNeDWCI0vo'),
        previewUrl: buildYouTubePreviewUrl('gCNeDWCI0vo'),
        groups: ['breaking', 'mideast'],
        note: 'Middle East and global south perspective.',
        language: 'EN',
        priority: 98,
    },
    {
        id: 'sky-news-arabia',
        name: 'Sky Arabia',
        provider: 'Sky News Arabia',
        type: 'youtube',
        videoId: 'U--OjmpjF5o',
        streamUrl: buildYouTubeEmbedUrl('U--OjmpjF5o'),
        sourceUrl: buildYouTubeWatchUrl('U--OjmpjF5o'),
        previewUrl: buildYouTubePreviewUrl('U--OjmpjF5o'),
        groups: ['mideast'],
        note: 'Arabic-language rolling coverage.',
        language: 'AR',
        priority: 90,
    },
    {
        id: 'trt-world',
        name: 'TRT World',
        provider: 'TRT World',
        type: 'youtube',
        videoId: 'ABfFhWzWs0s',
        streamUrl: buildYouTubeEmbedUrl('ABfFhWzWs0s'),
        sourceUrl: buildYouTubeWatchUrl('ABfFhWzWs0s'),
        previewUrl: buildYouTubePreviewUrl('ABfFhWzWs0s'),
        groups: ['mideast', 'asia', 'europe'],
        note: 'Cross-theater coverage spanning Europe, MENA, and Asia.',
        language: 'EN',
        priority: 88,
    },
    {
        id: 'alarabiya',
        name: 'Al Arabiya',
        provider: 'AlArabiya',
        type: 'youtube',
        videoId: 'n7eQejkXbnM',
        streamUrl: buildYouTubeEmbedUrl('n7eQejkXbnM'),
        sourceUrl: buildYouTubeWatchUrl('n7eQejkXbnM'),
        previewUrl: buildYouTubePreviewUrl('n7eQejkXbnM'),
        groups: ['mideast'],
        note: 'Arabic regional desk and breaking coverage.',
        language: 'AR',
        priority: 86,
    },
    {
        id: 'aj-mubasher',
        name: 'AJ Mubasher',
        provider: 'Al Jazeera Mubasher',
        type: 'hls',
        streamUrl: 'https://live-hls-web-ajm.getaj.net/AJM/index.m3u8',
        sourceUrl: 'https://mubasher.aljazeera.net/live/',
        previewUrl: '',
        groups: ['mideast'],
        note: 'Direct HLS relay verified live.',
        language: 'AR',
        priority: 84,
    },
    {
        id: 'cna',
        name: 'CNA',
        provider: 'Channel News Asia',
        type: 'youtube',
        videoId: 'XWq5kBlakcQ',
        streamUrl: buildYouTubeEmbedUrl('XWq5kBlakcQ'),
        sourceUrl: buildYouTubeWatchUrl('XWq5kBlakcQ'),
        previewUrl: buildYouTubePreviewUrl('XWq5kBlakcQ'),
        groups: ['asia'],
        note: 'Asia-focused headlines and documentaries.',
        language: 'EN',
        priority: 90,
    },
    {
        id: 'india-today',
        name: 'India Today',
        provider: 'India Today',
        type: 'youtube',
        videoId: 'sYZtOFzM78M',
        streamUrl: buildYouTubeEmbedUrl('sYZtOFzM78M'),
        sourceUrl: buildYouTubeWatchUrl('sYZtOFzM78M'),
        previewUrl: buildYouTubePreviewUrl('sYZtOFzM78M'),
        groups: ['asia'],
        note: 'South Asia live desk.',
        language: 'EN',
        priority: 82,
    },
    {
        id: 'cnbc',
        name: 'CNBC',
        provider: 'CNBC',
        type: 'youtube',
        videoId: '9NyxcX3rhQs',
        streamUrl: buildYouTubeEmbedUrl('9NyxcX3rhQs'),
        sourceUrl: buildYouTubeWatchUrl('9NyxcX3rhQs'),
        previewUrl: buildYouTubePreviewUrl('9NyxcX3rhQs'),
        groups: ['business'],
        note: 'US business and macro programming.',
        language: 'EN',
        priority: 88,
    },
    {
        id: 'yahoo-finance',
        name: 'Yahoo Finance',
        provider: 'Yahoo Finance',
        type: 'youtube',
        videoId: 'KQp-e_XQnDE',
        streamUrl: buildYouTubeEmbedUrl('KQp-e_XQnDE'),
        sourceUrl: buildYouTubeWatchUrl('KQp-e_XQnDE'),
        previewUrl: buildYouTubePreviewUrl('KQp-e_XQnDE'),
        groups: ['business'],
        note: '24/7 market coverage and interviews.',
        language: 'EN',
        priority: 80,
    },
];

const RELAY_TOPIC_TEMPLATES = [
    {
        id: 'iran',
        label: 'IRAN',
        keywords: [/\biran\b/i, /\biranian\b/i, /\btehran\b/i, /\bisfahan\b/i, /\bqom\b/i],
        channelGroups: ['mideast', 'breaking', 'business'],
        preferredChannelIds: ['aljazeera-english', 'alarabiya', 'sky-news-arabia', 'trt-world', 'bloomberg'],
    },
    {
        id: 'israel-gaza',
        label: 'ISRAEL / GAZA',
        keywords: [/\bisrael\b/i, /\bgaza\b/i, /\bhamas\b/i, /\bhezbollah\b/i, /\blebanon\b/i, /\bwest bank\b/i],
        channelGroups: ['mideast', 'breaking'],
        preferredChannelIds: ['aljazeera-english', 'sky-news-arabia', 'alarabiya', 'france24-en', 'trt-world'],
    },
    {
        id: 'oil-energy',
        label: 'OIL / ENERGY',
        keywords: [/\boil\b/i, /\bbrent\b/i, /\bcrude\b/i, /\bopec\b/i, /\bgas\b/i, /\benergy\b/i, /\blng\b/i],
        channelGroups: ['business', 'mideast', 'breaking'],
        preferredChannelIds: ['bloomberg', 'cnbc', 'yahoo-finance', 'aljazeera-english'],
    },
    {
        id: 'red-sea',
        label: 'RED SEA',
        keywords: [/\bred sea\b/i, /\bhormuz\b/i, /\bshipping\b/i, /\bwarship\b/i, /\bcarrier\b/i, /\bhouthi\b/i, /\bnavy\b/i],
        channelGroups: ['mideast', 'business', 'breaking'],
        preferredChannelIds: ['aljazeera-english', 'trt-world', 'bloomberg', 'alarabiya'],
    },
    {
        id: 'ukraine-russia',
        label: 'UKRAINE',
        keywords: [/\bukraine\b/i, /\brussia\b/i, /\bmoscow\b/i, /\bkyiv\b/i, /\bblack sea\b/i],
        channelGroups: ['europe', 'breaking'],
        preferredChannelIds: ['dw-news', 'euronews', 'france24-en', 'trt-world'],
    },
    {
        id: 'euro-security',
        label: 'EURO SECURITY',
        keywords: [/\bnato\b/i, /\beurope\b/i, /\beu\b/i, /\bgermany\b/i, /\bpoland\b/i, /\bfrance\b/i, /\bbritain\b/i],
        channelGroups: ['europe', 'breaking'],
        preferredChannelIds: ['dw-news', 'euronews', 'france24-en', 'bloomberg'],
    },
    {
        id: 'asia-pacific',
        label: 'ASIA-PAC',
        keywords: [/\bchina\b/i, /\btaiwan\b/i, /\bsouth china sea\b/i, /\bindo-pacific\b/i, /\bjapan\b/i, /\bkorea\b/i, /\bphilippines\b/i],
        channelGroups: ['asia', 'breaking'],
        preferredChannelIds: ['cna', 'trt-world', 'dw-news'],
    },
    {
        id: 'india-watch',
        label: 'INDIA',
        keywords: [/\bindia\b/i, /\bdelhi\b/i, /\bpakistan\b/i, /\bkashmir\b/i, /\bindian ocean\b/i],
        channelGroups: ['asia', 'breaking'],
        preferredChannelIds: ['india-today', 'cna', 'trt-world'],
    },
    {
        id: 'markets',
        label: 'MARKETS',
        keywords: [/\bmarkets?\b/i, /\bstocks?\b/i, /\bnasdaq\b/i, /\bs&p\b/i, /\bfed\b/i, /\binflation\b/i, /\btariffs?\b/i, /\bbonds?\b/i, /\bcurrency\b/i],
        channelGroups: ['business', 'breaking'],
        preferredChannelIds: ['bloomberg', 'cnbc', 'yahoo-finance'],
    },
    {
        id: 'cyber-space',
        label: 'CYBER / SPACE',
        keywords: [/\bcyber\b/i, /\bhack\b/i, /\bmalware\b/i, /\bsatellite\b/i, /\bspace\b/i, /\borbital\b/i, /\bgps\b/i, /\bspoof\b/i],
        channelGroups: ['breaking', 'asia', 'europe'],
        preferredChannelIds: ['dw-news', 'cna', 'bloomberg'],
    },
    {
        id: 'us-ops',
        label: 'U.S. OPS',
        keywords: [/\bpentagon\b/i, /\bwashington\b/i, /\bunited states\b/i, /\bu\.s\.\b/i, /\busa\b/i, /\bwhite house\b/i],
        channelGroups: ['breaking', 'business'],
        preferredChannelIds: ['bloomberg', 'dw-news', 'trt-world'],
    },
];

function countMatches(text, patterns) {
    return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
}

function recencyWeight(timestampMs) {
    if (!timestampMs) return 1;
    const age = Date.now() - timestampMs;
    if (age <= 6 * 60 * 60 * 1000) return 3;
    if (age <= 24 * 60 * 60 * 1000) return 2;
    return 1;
}

function severityWeight(item) {
    const severity = classifyIntelSeverity(item);
    if (severity === 'critical') return 5;
    if (severity === 'elevated') return 3;
    return 1;
}

function getIntelText(item) {
    return `${item?.title || ''} ${item?.source || ''} ${item?.link || ''}`.toLowerCase();
}

function fallbackTopicForRegion(intelRegion) {
    switch (intelRegion) {
        case 'iran':
            return 'iran';
        case 'mideast':
            return 'mideast';
        case 'europe':
            return 'europe';
        case 'asia':
            return 'asia-pacific';
        case 'americas':
            return 'markets';
        default:
            return 'breaking';
    }
}

export function buildDynamicRelayTopics(items, maxTopics = 10) {
    if (!Array.isArray(items) || !items.length) {
        return NEWS_RELAY_FALLBACK_TOPICS.map((topic) => ({
            ...topic,
            score: 0,
            matchCount: 0,
        }));
    }

    const scored = RELAY_TOPIC_TEMPLATES.map((template) => {
        let score = 0;
        let matchCount = 0;

        for (const item of items) {
            const text = getIntelText(item);
            const matches = countMatches(text, template.keywords);
            if (!matches) continue;
            matchCount += 1;
            score += matches * severityWeight(item) * recencyWeight(item?.publishedAt);
        }

        return {
            ...template,
            score,
            matchCount,
        };
    })
        .filter((topic) => topic.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxTopics);

    if (!scored.length) {
        return NEWS_RELAY_FALLBACK_TOPICS.map((topic) => ({
            ...topic,
            score: 0,
            matchCount: 0,
        }));
    }

    return scored;
}

export function readRelayTopicsCache() {
    try {
        const raw = localStorage.getItem(RELAY_TOPIC_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.topics) || !parsed.topics.length) return null;
        return {
            topics: parsed.topics,
            createdAt: Number.isFinite(parsed.createdAt) ? parsed.createdAt : 0,
            sourceUpdatedAt: Number.isFinite(parsed.sourceUpdatedAt) ? parsed.sourceUpdatedAt : 0,
        };
    } catch (err) {
        return null;
    }
}

export function isRelayTopicsCacheFresh(cache, sourceUpdatedAt = 0, now = Date.now()) {
    if (!cache?.createdAt) return false;
    if (now - cache.createdAt >= RELAY_TOPIC_CACHE_MAX_AGE_MS) return false;
    if (sourceUpdatedAt && cache.sourceUpdatedAt && cache.sourceUpdatedAt < sourceUpdatedAt) return false;
    return true;
}

export function writeRelayTopicsCache(topics, sourceUpdatedAt = 0) {
    try {
        localStorage.setItem(RELAY_TOPIC_CACHE_KEY, JSON.stringify({
            topics,
            createdAt: Date.now(),
            sourceUpdatedAt,
        }));
    } catch (err) {
        // Ignore cache write failures.
    }
}

export function resolveRelayTopics(items, sourceUpdatedAt = 0) {
    const cache = readRelayTopicsCache();
    if (isRelayTopicsCacheFresh(cache, sourceUpdatedAt)) {
        return cache.topics;
    }

    const topics = buildDynamicRelayTopics(items, 10);
    writeRelayTopicsCache(topics, sourceUpdatedAt);
    return topics;
}

export function getDefaultRelayTopicId(intelRegion, topics = []) {
    const fallbackId = fallbackTopicForRegion(intelRegion);
    if (topics.some((topic) => topic.id === fallbackId)) return fallbackId;

    if (intelRegion === 'iran') {
        const priority = ['iran', 'israel-gaza', 'oil-energy', 'red-sea'];
        const match = priority.find((id) => topics.some((topic) => topic.id === id));
        if (match) return match;
    }

    if (intelRegion === 'mideast') {
        const match = topics.find((topic) => topic.channelGroups?.includes('mideast'));
        if (match) return match.id;
    }

    if (intelRegion === 'europe') {
        const match = topics.find((topic) => topic.channelGroups?.includes('europe'));
        if (match) return match.id;
    }

    if (intelRegion === 'asia') {
        const match = topics.find((topic) => topic.channelGroups?.includes('asia'));
        if (match) return match.id;
    }

    if (intelRegion === 'americas') {
        const priority = ['markets', 'us-ops', 'breaking'];
        const match = priority.find((id) => topics.some((topic) => topic.id === id));
        if (match) return match;
    }

    return topics[0]?.id || NEWS_RELAY_FALLBACK_TOPICS[0].id;
}

export function getRelayChannels(topicOrId, topics = []) {
    const topic = typeof topicOrId === 'string'
        ? topics.find((item) => item.id === topicOrId) || NEWS_RELAY_FALLBACK_TOPICS.find((item) => item.id === topicOrId)
        : topicOrId;

    if (!topic) return [];

    const preferredIds = new Set(topic.preferredChannelIds || []);
    return CURATED_NEWS_STREAMS
        .filter((channel) => channel.groups.some((group) => topic.channelGroups?.includes(group)))
        .sort((a, b) => {
            const aScore = a.priority + (preferredIds.has(a.id) ? 1000 : 0);
            const bScore = b.priority + (preferredIds.has(b.id) ? 1000 : 0);
            return bScore - aScore;
        });
}
