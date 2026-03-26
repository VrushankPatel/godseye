const missingRuntimeWarnings = new Set();
const INVALID_ENV_SENTINELS = new Set([
    '',
    '-',
    'test',
    'demo',
    'placeholder',
    'changeme',
    'replace-me',
    'your_key_here',
    'your-api-key',
    'undefined',
    'null',
    'false',
    '0',
]);

function normalizeEnvKeys(keys) {
    return Array.isArray(keys) ? keys.filter(Boolean) : [keys].filter(Boolean);
}

function isUsableEnvValue(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return false;
    return !INVALID_ENV_SENTINELS.has(normalized.toLowerCase());
}

export function readEnvValue(keys) {
    const env = import.meta.env || {};
    for (const key of normalizeEnvKeys(keys)) {
        const value = String(env[key] || '').trim();
        if (isUsableEnvValue(value)) return value;
    }
    return '';
}

export function reportMissingRuntimeKey(keys, featureLabel) {
    const normalizedKeys = normalizeEnvKeys(keys);
    if (!normalizedKeys.length) return;

    const warningId = normalizedKeys.join('|');
    if (missingRuntimeWarnings.has(warningId)) return;
    missingRuntimeWarnings.add(warningId);

    const keyLabel = normalizedKeys.join(' or ');
    const featureText = featureLabel ? ` ${featureLabel}` : ' This integration';
    console.error(
        `[Godseye] Missing API key (${keyLabel}).${featureText} may be unavailable; data may or may not be available.`
    );
}

export function getRuntimeKey(keys, featureLabel = '') {
    const value = readEnvValue(keys);
    if (!value) {
        reportMissingRuntimeKey(keys, featureLabel);
    }
    return value;
}

export function reportMissingOptionalRuntimeConfig() {
    getRuntimeKey(
        ['VITE_GOOGLE_MAPS_3D_KEY', 'VITE_GOOGLE_MAPS_API_KEY'],
        ' Google Photorealistic 3D tiles'
    );
    getRuntimeKey('VITE_YOUTUBE_API_KEY', ' YouTube live CCTV discovery');
    getRuntimeKey('VITE_GUARDIAN_API_KEY', ' Guardian intelligence enrichment');
    getRuntimeKey('VITE_AISSTREAM_API_KEY', ' AIS live vessel tracking');
    getRuntimeKey('VITE_FIREBASE_RTDB_URL', ' Shared Firebase RTDB cache');
    getRuntimeKey('VITE_GODSEYE_CACHE_SECRET', ' Shared cache encryption');
}
