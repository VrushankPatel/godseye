export const INTEL_REGIONS = [
    { id: 'all', label: 'ALL' },
    { id: 'iran', label: 'IRAN' },
    { id: 'mideast', label: 'MIDEAST' },
    { id: 'europe', label: 'EUROPE' },
    { id: 'asia', label: 'ASIA' },
    { id: 'americas', label: 'AMERICAS' },
];

const REGION_PATTERNS = {
    iran: [
        /\biran\b/i,
        /\biranian\b/i,
        /\btehran\b/i,
        /\bhormuz\b/i,
        /\bpersian gulf\b/i,
        /\bqom\b/i,
        /\bisfahan\b/i,
    ],
    mideast: [
        /\bmiddle east\b/i,
        /\biran\b/i,
        /\bisrael\b/i,
        /\bgaza\b/i,
        /\blebanon\b/i,
        /\bsyria\b/i,
        /\biraq\b/i,
        /\byemen\b/i,
        /\bred sea\b/i,
        /\bhouthi\b/i,
        /\bhamas\b/i,
        /\bhezbollah\b/i,
        /\bsaudi\b/i,
        /\buae\b/i,
        /\bqatar\b/i,
        /\bom(an|ani)\b/i,
        /\bkuwait\b/i,
        /\bbahrain\b/i,
        /\bwest bank\b/i,
    ],
    europe: [
        /\beurope\b/i,
        /\bukraine\b/i,
        /\brussia\b/i,
        /\bnato\b/i,
        /\beu\b/i,
        /\blondon\b/i,
        /\bparis\b/i,
        /\bberlin\b/i,
        /\bpoland\b/i,
        /\bfrance\b/i,
        /\bgermany\b/i,
        /\bbritain\b/i,
    ],
    asia: [
        /\basia\b/i,
        /\bchina\b/i,
        /\btaiwan\b/i,
        /\bsouth china sea\b/i,
        /\bjapan\b/i,
        /\bindia\b/i,
        /\bpakistan\b/i,
        /\bkorea\b/i,
        /\bphilippines\b/i,
        /\bindo-pacific\b/i,
    ],
    americas: [
        /\bamerica(s)?\b/i,
        /\bunited states\b/i,
        /\bu\.s\.\b/i,
        /\busa\b/i,
        /\bcanada\b/i,
        /\bmexico\b/i,
        /\bwashington\b/i,
        /\bnew york\b/i,
        /\btexas\b/i,
        /\bbrazil\b/i,
        /\bargentina\b/i,
    ],
};

const REGION_BOUNDS = {
    iran: { west: 44, east: 64, south: 24, north: 40 },
    mideast: { west: 24, east: 64, south: 10, north: 42 },
    europe: { west: -11, east: 42, south: 35, north: 71 },
    asia: { west: 60, east: 150, south: -12, north: 55 },
    americas: { west: -170, east: -30, south: -56, north: 72 },
};

const CRITICAL_PATTERN = /\b(airstrike|missile|ballistic|invasion|evacuation|casualt|explosion|attack|retaliat|hostage|sirens|troop deployment|warship|carrier strike|drone strike)\b/i;
const ELEVATED_PATTERN = /\b(conflict|military|defen[cs]e|border|navy|air force|sanction|cyber|strike|tension|escalat|intercept|exercise|surveillance)\b/i;

const DOMAIN_PATTERNS = {
    air: /\b(aircraft|airstrike|jet|fighter|bomber|drone|sortie|air defense|air force|missile)\b/i,
    sea: /\b(ship|vessel|destroyer|frigate|carrier|submarine|navy|strait|port|red sea|hormuz|aitch|ais)\b/i,
    ground: /\b(troop|ground|border|armor|tank|artillery|conflict|base|militia|infantry|checkpoint)\b/i,
    cyber: /\b(cyber|hack|malware|ransomware|outage|telecom|satcom|gps jam|spoof)\b/i,
};

const STOP_WORDS = new Set([
    'about', 'after', 'amid', 'amidst', 'against', 'alert', 'analysis', 'attack', 'attacks',
    'because', 'between', 'breaking', 'could', 'defense', 'during', 'english', 'first',
    'from', 'global', 'group', 'have', 'into', 'iran', 'iranian', 'israel', 'latest',
    'live', 'middle', 'military', 'news', 'over', 'says', 'security', 'still', 'their',
    'there', 'these', 'this', 'today', 'update', 'video', 'watch', 'what', 'when',
    'with', 'world',
]);

function getIntelText(item) {
    return `${item?.title || ''} ${item?.source || ''} ${item?.link || ''}`.toLowerCase();
}

function getItemCoordinates(item) {
    if (!item || typeof item !== 'object') return null;

    const latitude = Number(
        item.latitude ??
        item.lat ??
        item.center?.[1] ??
        item.coordinates?.[1] ??
        item.position?.[1]
    );
    const longitude = Number(
        item.longitude ??
        item.lng ??
        item.lon ??
        item.center?.[0] ??
        item.coordinates?.[0] ??
        item.position?.[0]
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
}

export function classifyIntelSeverity(item) {
    const text = getIntelText(item);
    if (CRITICAL_PATTERN.test(text)) return 'critical';
    if (ELEVATED_PATTERN.test(text)) return 'elevated';
    return 'monitor';
}

export function matchesIntelRegion(item, regionId) {
    if (!regionId || regionId === 'all') return true;
    const patterns = REGION_PATTERNS[regionId] || [];
    if (patterns.some((pattern) => pattern.test(getIntelText(item)))) return true;

    const coords = getItemCoordinates(item);
    if (!coords) return false;
    return isWithinIntelRegion(coords.latitude, coords.longitude, regionId);
}

export function isWithinIntelRegion(latitude, longitude, regionId) {
    if (!regionId || regionId === 'all') return true;
    const bounds = REGION_BOUNDS[regionId];
    if (!bounds) return false;
    return (
        latitude >= bounds.south &&
        latitude <= bounds.north &&
        longitude >= bounds.west &&
        longitude <= bounds.east
    );
}

export function buildIntelRegionCounts(items) {
    const counts = Object.fromEntries(INTEL_REGIONS.map((region) => [region.id, 0]));
    counts.all = Array.isArray(items) ? items.length : 0;

    for (const item of items || []) {
        for (const region of INTEL_REGIONS) {
            if (region.id === 'all') continue;
            if (matchesIntelRegion(item, region.id)) {
                counts[region.id] += 1;
            }
        }
    }

    return counts;
}

export function buildTrendingIntelKeywords(items, regionId = 'all', limit = 5) {
    const counts = new Map();

    for (const item of items || []) {
        if (!matchesIntelRegion(item, regionId)) continue;

        const tokens = String(item?.title || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);

        for (const token of tokens) {
            if (token.length < 4) continue;
            if (/^\d+$/.test(token)) continue;
            if (STOP_WORDS.has(token)) continue;
            counts.set(token, (counts.get(token) || 0) + 1);
        }
    }

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, count]) => ({ label, count }));
}

function countLayerEntities(layer, regionId) {
    if (!layer?.enabled || !Array.isArray(layer.data)) return 0;
    return layer.data.reduce((total, item) => {
        const coords = getItemCoordinates(item);
        if (!coords) return total;
        return total + (isWithinIntelRegion(coords.latitude, coords.longitude, regionId) ? 1 : 0);
    }, 0);
}

export function buildStrategicPosture(items, layers, regionId = 'all') {
    const scopedItems = (items || []).filter((item) => matchesIntelRegion(item, regionId));
    const critical = scopedItems.filter((item) => classifyIntelSeverity(item) === 'critical').length;
    const elevated = scopedItems.filter((item) => classifyIntelSeverity(item) === 'elevated').length;

    const air = countLayerEntities(layers?.aircraft, regionId) + countLayerEntities(layers?.militaryActivity, regionId);
    const sea = countLayerEntities(layers?.maritime, regionId);
    const ground = countLayerEntities(layers?.conflicts, regionId) + countLayerEntities(layers?.militaryBases, regionId);
    const alerts = countLayerEntities(layers?.airspace, regionId) + countLayerEntities(layers?.forbiddenZones, regionId);

    const domainCounts = { air: 0, sea: 0, ground: 0, cyber: 0 };
    for (const item of scopedItems) {
        const text = getIntelText(item);
        for (const [domain, pattern] of Object.entries(DOMAIN_PATTERNS)) {
            if (pattern.test(text)) domainCounts[domain] += 1;
        }
    }

    const score = Math.min(
        100,
        critical * 18 +
        elevated * 8 +
        Math.min(air, 12) * 2 +
        Math.min(sea, 8) * 3 +
        Math.min(ground, 10) * 3 +
        Math.min(alerts, 8) * 2
    );

    let level = 'STABLE';
    if (score >= 72) level = 'CRITICAL';
    else if (score >= 40) level = 'ELEVATED';
    else if (score >= 20) level = 'WATCH';

    return {
        level,
        score,
        headlineCount: scopedItems.length,
        criticalCount: critical,
        elevatedCount: elevated,
        signals: {
            air,
            sea,
            ground,
            alerts,
        },
        domains: domainCounts,
        trending: buildTrendingIntelKeywords(scopedItems, 'all', 5),
    };
}

export function filterIntelByMonitors(items, monitors, regionId = 'all') {
    const activeMonitors = (monitors || []).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    if (!activeMonitors.length) return [];

    return (items || []).filter((item) => {
        if (!matchesIntelRegion(item, regionId)) return false;
        const text = getIntelText(item);
        return activeMonitors.some((term) => text.includes(term));
    });
}
