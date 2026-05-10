import { describe, it, expect } from 'vitest';
import {
    createLayerMeta,
    deriveLayerAge,
    formatLayerAge,
    getLayerHealthLabel,
    getLayerHealthColorClass,
    mergeLayerMeta,
} from '../../src/utils/layerHealth';

describe('layerHealth utilities', () => {
    describe('createLayerMeta', () => {
        it('creates default meta with idle health', () => {
            const meta = createLayerMeta();
            expect(meta.lastSuccessAt).toBe(0);
            expect(meta.lastAttemptAt).toBe(0);
            expect(meta.sourceName).toBe('');
            expect(meta.isCached).toBe(false);
            expect(meta.health).toBe('idle');
        });

        it('allows overriding default values', () => {
            const meta = createLayerMeta({ health: 'live', sourceName: 'test' });
            expect(meta.health).toBe('live');
            expect(meta.sourceName).toBe('test');
        });
    });

    describe('deriveLayerAge', () => {
        it('returns null for invalid lastSuccessAt', () => {
            expect(deriveLayerAge(0)).toBe(null);
            expect(deriveLayerAge(-1)).toBe(null);
            expect(deriveLayerAge(null)).toBe(null);
        });

        it('calculates age from lastSuccessAt', () => {
            const now = Date.now();
            const lastSuccess = now - 60000;
            expect(deriveLayerAge(lastSuccess, now)).toBe(60000);
        });
    });

    describe('formatLayerAge', () => {
        it('returns n/a for invalid values', () => {
            expect(formatLayerAge(-1)).toBe('n/a');
            expect(formatLayerAge(null)).toBe('n/a');
            expect(formatLayerAge(Infinity)).toBe('n/a');
        });

        it('returns now for values under 1 minute', () => {
            expect(formatLayerAge(0)).toBe('now');
            expect(formatLayerAge(30000)).toBe('now');
        });

        it('formats minutes for values under 1 hour', () => {
            expect(formatLayerAge(120000)).toBe('2m');
            expect(formatLayerAge(3540000)).toBe('59m');
        });

        it('formats hours for values under 1 day', () => {
            expect(formatLayerAge(3600000)).toBe('1h');
            expect(formatLayerAge(86399000)).toBe('23h');
        });

        it('formats days for values 1 day or more', () => {
            expect(formatLayerAge(86400000)).toBe('1d');
            expect(formatLayerAge(172800000)).toBe('2d');
        });
    });

    describe('getLayerHealthLabel', () => {
        it('returns correct labels for health states', () => {
            expect(getLayerHealthLabel({ health: 'live' })).toBe('LIVE');
            expect(getLayerHealthLabel({ health: 'cached' })).toBe('CACHED');
            expect(getLayerHealthLabel({ health: 'stale' })).toBe('STALE');
            expect(getLayerHealthLabel({ health: 'degraded' })).toBe('DEGRADED');
            expect(getLayerHealthLabel({ health: 'error' })).toBe('OFFLINE');
            expect(getLayerHealthLabel({ health: 'loading' })).toBe('SYNCING');
            expect(getLayerHealthLabel({})).toBe('IDLE');
        });

        it('handles uppercase input', () => {
            expect(getLayerHealthLabel({ health: 'LIVE' })).toBe('LIVE');
        });
    });

    describe('getLayerHealthColorClass', () => {
        it('returns correct color classes', () => {
            expect(getLayerHealthColorClass({ health: 'live' })).toBe('text-neon-green');
            expect(getLayerHealthColorClass({ health: 'cached' })).toBe('text-electric-blue');
            expect(getLayerHealthColorClass({ health: 'stale' })).toBe('text-neon-amber');
            expect(getLayerHealthColorClass({ health: 'degraded' })).toBe('text-neon-amber');
            expect(getLayerHealthColorClass({ health: 'error' })).toBe('text-neon-red');
            expect(getLayerHealthColorClass({})).toBe('text-text-dim');
        });
    });

    describe('mergeLayerMeta', () => {
        it('merges previous meta with patch', () => {
            const previous = { health: 'loading', lastAttemptAt: 1000 };
            const patch = { health: 'live', lastSuccessAt: 2000 };
            const merged = mergeLayerMeta(previous, patch, { now: 3000 });

            expect(merged.health).toBe('live');
            expect(merged.lastSuccessAt).toBe(2000);
            expect(merged.lastAttemptAt).toBe(1000);
            expect(merged.ageMs).toBe(1000);
        });

        it('calculates ageMs correctly', () => {
            const previous = { lastSuccessAt: 0 };
            const patch = { lastSuccessAt: 1000 };
            const merged = mergeLayerMeta(previous, patch, { now: 5000 });

            expect(merged.ageMs).toBe(4000);
        });
    });
});