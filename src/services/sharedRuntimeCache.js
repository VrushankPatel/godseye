import { API_URLS } from '../constants/dataSources';
import { fetchJsonWithPolicy, fetchWithPolicy } from '../utils/network';
import { getRuntimeKey, readEnvValue } from '../utils/runtimeEnv';

const SHARED_CACHE_MAX_AGE_MS = 90 * 60 * 1000;
const CACHE_PATH = 'godsEyeData.json';
const CACHE_SCHEMA_VERSION = 'gdx-cache-v1';
const HASH_NAMESPACE = 'godseye.integrity.v1';
const DEBUG_PREFIX = '[GodseyeCache]';

function log(message, payload) {
    if (payload === undefined) {
        console.log(`${DEBUG_PREFIX} ${message}`);
        return;
    }
    console.log(`${DEBUG_PREFIX} ${message}`, payload);
}

function base64FromBytes(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function bytesFromBase64(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const entries = Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
}

function normalizeDbUrl(rawValue) {
    const trimmed = String(rawValue || '').trim().replace(/^['"]+|['"]+$/g, '');
    if (!trimmed) return '';

    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(candidate);
        return url.toString().replace(/\/$/, '');
    } catch {
        return '';
    }
}

function getDbUrl() {
    return normalizeDbUrl(readEnvValue('VITE_FIREBASE_RTDB_URL'));
}

function getCacheSecret() {
    return getRuntimeKey('VITE_GODSEYE_CACHE_SECRET', ' Shared RTDB cache encryption');
}

async function sha256Bytes(dataBytes) {
    const digest = await crypto.subtle.digest('SHA-256', dataBytes);
    return new Uint8Array(digest);
}

async function deriveKey(secret, saltBytes, usage) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 120000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: usage === 'sign' ? 'HMAC' : 'AES-GCM', ...(usage === 'sign' ? { hash: 'SHA-256', length: 256 } : { length: 256 }) },
        false,
        usage === 'sign' ? ['sign'] : ['encrypt', 'decrypt']
    );
}

async function computeCustomHash(data, secret) {
    const canonical = stableStringify(data);
    const secretSalt = await sha256Bytes(new TextEncoder().encode(`${HASH_NAMESPACE}:${secret}`));
    const hmacKey = await deriveKey(secret, secretSalt.subarray(0, 16), 'sign');
    const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(canonical));
    const digest = base64FromBytes(new Uint8Array(signature))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    return `GDX-${digest.slice(0, 16)}-${digest.slice(16, 32)}-${digest.slice(32, 48)}`;
}

async function encryptDataObject(data, secret) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(secret, salt, 'encrypt');
    const plaintext = new TextEncoder().encode(stableStringify(data));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return {
        algorithm: 'AES-GCM',
        encoding: 'base64',
        iv: base64FromBytes(iv),
        salt: base64FromBytes(salt),
        payload: base64FromBytes(new Uint8Array(ciphertext)),
    };
}

async function decryptEnvelope(envelope, secret) {
    const iv = bytesFromBase64(envelope?.iv);
    const salt = bytesFromBase64(envelope?.salt);
    const payload = bytesFromBase64(envelope?.payload);
    const key = await deriveKey(secret, salt, 'encrypt');
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, payload);
    return JSON.parse(new TextDecoder().decode(plaintext));
}

async function fetchLocalManifestPayload() {
    const [intelWire, cctvManifest, satelliteManifest] = await Promise.all([
        fetchJsonWithPolicy(API_URLS.INTEL_WIRE_MANIFEST, {
            timeoutMs: 12000,
            retries: 1,
            circuitKey: 'shared-cache:intel-manifest',
        }),
        fetchJsonWithPolicy(API_URLS.VERIFIED_CCTV_MANIFEST, {
            timeoutMs: 12000,
            retries: 1,
            circuitKey: 'shared-cache:cctv-manifest',
        }),
        fetchJsonWithPolicy(API_URLS.SATELLITE_ACTIVE_MANIFEST, {
            timeoutMs: 12000,
            retries: 1,
            circuitKey: 'shared-cache:satellite-manifest',
        }),
    ]);

    return {
        version: CACHE_SCHEMA_VERSION,
        generatedAt: Date.now(),
        intelWire,
        cctvManifest,
        satelliteManifest,
    };
}

function buildRtdbEndpoint(dbUrl) {
    return `${dbUrl}/${CACHE_PATH}`;
}

export function isSharedCacheFresh(timestamp) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
    return Date.now() - timestamp < SHARED_CACHE_MAX_AGE_MS;
}

export function getSharedCacheSections(payload) {
    return {
        intelWire: payload?.intelWire || null,
        cctvManifest: payload?.cctvManifest || null,
        satelliteManifest: payload?.satelliteManifest || null,
    };
}

export async function readSharedRuntimeCache() {
    const dbUrl = getDbUrl();
    const secret = getCacheSecret();
    if (!dbUrl || !secret) return null;

    log('Retrieving data from realtime db');
    const response = await fetchWithPolicy(buildRtdbEndpoint(dbUrl), {
        method: 'GET',
        timeoutMs: 10000,
        retries: 2,
        retryDelayMs: 700,
        circuitKey: 'shared-cache:rtdb-read',
    });

    const raw = await response.json();
    log('Got this data', raw);
    if (!raw?.data?.payload) {
        log('Realtime db does not currently contain a shared cache payload');
        return null;
    }

    const decrypted = await decryptEnvelope(raw.data, secret);
    log('Decrypted the data to real json which is', decrypted);

    const computedHash = await computeCustomHash(decrypted, secret);
    if (computedHash !== raw.hash) {
        log('Hash mismatch detected, cached data is considered tempered with');
        return {
            valid: false,
            reason: 'hash_mismatch',
            payload: decrypted,
            timestamp: Number(raw.timestamp || 0),
        };
    }

    log('Hash of the data is intact so its not tempered with');

    const timestamp = Number(raw.timestamp || 0);
    if (!isSharedCacheFresh(timestamp)) {
        log('timestamp is older than 90 minutes, skipping cached data');
        return {
            valid: false,
            reason: 'stale_timestamp',
            payload: decrypted,
            timestamp,
        };
    }

    log('timestamp is less than 90 minutes old, using this data and skipping retrieving from the web');
    return {
        valid: true,
        payload: decrypted,
        timestamp,
    };
}

export async function writeSharedRuntimeCache(payload) {
    const dbUrl = getDbUrl();
    const secret = getCacheSecret();
    if (!dbUrl || !secret) return null;

    const envelope = await encryptDataObject(payload, secret);
    const hash = await computeCustomHash(payload, secret);
    const timestamp = Date.now();
    const body = {
        data: envelope,
        hash,
        timestamp,
        schemaVersion: CACHE_SCHEMA_VERSION,
    };

    log('Publishing refreshed encrypted data to realtime db');
    await fetchWithPolicy(buildRtdbEndpoint(dbUrl), {
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        timeoutMs: 12000,
        retries: 2,
        retryDelayMs: 800,
        circuitKey: 'shared-cache:rtdb-write',
    });
    return { hash, timestamp };
}

export async function buildFreshSharedRuntimeData() {
    return fetchLocalManifestPayload();
}

export async function hydrateSharedRuntimeCache({ forceRefresh = false } = {}) {
    if (!getDbUrl() || !getCacheSecret()) {
        return {
            status: 'missing_config',
            source: 'none',
            payload: null,
            timestamp: 0,
            integrity: 'missing_config',
        };
    }

    if (!forceRefresh) {
        try {
            const remote = await readSharedRuntimeCache();
            if (remote?.valid) {
                return {
                    status: 'active',
                    source: 'firebase_rtdb',
                    payload: remote.payload,
                    timestamp: remote.timestamp,
                    integrity: 'valid',
                };
            }
        } catch (error) {
            log(`Realtime DB cache read failed, falling back to source manifests: ${error.message}`);
        }
    } else {
        log('Force refresh requested, skipping realtime db read and rebuilding cache');
    }

    const freshPayload = await buildFreshSharedRuntimeData();
    log('Using fallback source data and preparing shared cache payload', freshPayload);

    try {
        const published = await writeSharedRuntimeCache(freshPayload);
        return {
            status: 'active',
            source: forceRefresh ? 'source_refresh_forced' : 'source_refresh',
            payload: freshPayload,
            timestamp: published?.timestamp || Date.now(),
            integrity: 'rebuilt',
        };
    } catch (error) {
        log(`Realtime DB cache publish failed, using fallback source data only: ${error.message}`);
        return {
            status: 'degraded',
            source: 'source_fallback',
            payload: freshPayload,
            timestamp: Date.now(),
            integrity: 'local_only',
            error: error.message,
        };
    }
}
