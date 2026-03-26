export function createLayerMeta(overrides = {}) {
    return {
        lastSuccessAt: 0,
        lastAttemptAt: 0,
        sourceName: '',
        isCached: false,
        ageMs: null,
        health: 'idle',
        errorCode: null,
        ...overrides,
    };
}

export function deriveLayerAge(lastSuccessAt, now = Date.now()) {
    if (!Number.isFinite(lastSuccessAt) || lastSuccessAt <= 0) return null;
    return Math.max(0, now - lastSuccessAt);
}

export function formatLayerAge(ageMs) {
    if (!Number.isFinite(ageMs) || ageMs < 0) return 'n/a';
    if (ageMs < 60_000) return 'now';
    if (ageMs < 3_600_000) return `${Math.floor(ageMs / 60_000)}m`;
    if (ageMs < 86_400_000) return `${Math.floor(ageMs / 3_600_000)}h`;
    return `${Math.floor(ageMs / 86_400_000)}d`;
}

export function getLayerHealthLabel(meta = {}) {
    const health = String(meta.health || '').toLowerCase();
    if (health === 'live') return 'LIVE';
    if (health === 'cached') return 'CACHED';
    if (health === 'stale') return 'STALE';
    if (health === 'degraded') return 'DEGRADED';
    if (health === 'error') return 'OFFLINE';
    if (health === 'loading') return 'SYNCING';
    return 'IDLE';
}

export function getLayerHealthColorClass(meta = {}) {
    const health = String(meta.health || '').toLowerCase();
    if (health === 'live') return 'text-neon-green';
    if (health === 'cached') return 'text-electric-blue';
    if (health === 'stale' || health === 'degraded') return 'text-neon-amber';
    if (health === 'error') return 'text-neon-red';
    return 'text-text-dim';
}

export function mergeLayerMeta(previousMeta = {}, patch = {}, options = {}) {
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const merged = {
        ...createLayerMeta(),
        ...previousMeta,
        ...patch,
    };

    merged.ageMs = deriveLayerAge(merged.lastSuccessAt, now);
    return merged;
}
