const missingRuntimeWarnings = new Set();

function normalizeEnvKeys(keys) {
    return Array.isArray(keys) ? keys.filter(Boolean) : [keys].filter(Boolean);
}

function readEnvValue(keys) {
    const env = import.meta.env || {};
    for (const key of normalizeEnvKeys(keys)) {
        const value = String(env[key] || '').trim();
        if (value) return value;
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
}
