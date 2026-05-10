import { describe, it, expect } from 'vitest';
import {
    ENTITY_ID_PREFIX_LAYER_MAP,
    inferLayerTypeFromEntityId,
} from '../../src/utils/entityMap';

describe('entityMap utilities', () => {
    describe('ENTITY_ID_PREFIX_LAYER_MAP', () => {
        it('contains mappings for all known layers', () => {
            const prefixes = ENTITY_ID_PREFIX_LAYER_MAP.map(([p]) => p);
            expect(prefixes).toContain('aircraft-');
            expect(prefixes).toContain('satellite-');
            expect(prefixes).toContain('seismic-');
            expect(prefixes).toContain('airport-');
        });

        it('has no duplicate prefixes', () => {
            const prefixes = ENTITY_ID_PREFIX_LAYER_MAP.map(([p]) => p);
            const unique = new Set(prefixes);
            expect(prefixes.length).toBe(unique.size);
        });
    });

    describe('inferLayerTypeFromEntityId', () => {
        it('returns aircraft for aircraft entity IDs', () => {
            expect(inferLayerTypeFromEntityId('aircraft-ABC123')).toBe('aircraft');
        });

        it('returns satellites for satellite entity IDs', () => {
            expect(inferLayerTypeFromEntityId('satellite-25544')).toBe('satellites');
        });

        it('returns seismic for seismic entity IDs', () => {
            expect(inferLayerTypeFromEntityId('seismic-12345')).toBe('seismic');
        });

        it('returns airQuality for air-quality entity IDs', () => {
            expect(inferLayerTypeFromEntityId('air-quality-station1')).toBe('airQuality');
        });

        it('returns unknown for unknown entity IDs', () => {
            expect(inferLayerTypeFromEntityId('unknown-id')).toBe('unknown');
        });

        it('handles empty string', () => {
            expect(inferLayerTypeFromEntityId('')).toBe('unknown');
        });

        it('handles null/undefined', () => {
            expect(inferLayerTypeFromEntityId(null)).toBe('unknown');
            expect(inferLayerTypeFromEntityId(undefined)).toBe('unknown');
        });

        it('returns first matching prefix', () => {
            expect(inferLayerTypeFromEntityId('maritime-vessel-123')).toBe('maritime');
            expect(inferLayerTypeFromEntityId('maritime-port-123')).toBe('maritime');
        });
    });
});