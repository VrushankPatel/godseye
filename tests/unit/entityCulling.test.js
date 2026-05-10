import { describe, it, expect } from 'vitest';
import {
    paginateEntities,
    filterEntitiesByBounds,
    sortEntitiesByDistance,
} from '../../src/utils/entityCulling';

describe('entityCulling utilities', () => {
    const mockEntities = Array.from({ length: 50 }, (_, i) => ({
        id: `entity-${i}`,
        latitude: 40 + (i * 0.1),
        longitude: -74 + (i * 0.1),
    }));

    describe('paginateEntities', () => {
        it('returns paginated results', () => {
            const result = paginateEntities(mockEntities, 10, 0);
            expect(result.items.length).toBe(10);
            expect(result.total).toBe(50);
        });

        it('calculates total pages correctly', () => {
            const result = paginateEntities(mockEntities, 10, 0);
            expect(result.totalPages).toBe(5);
        });

        it('indicates hasNext/hasPrev', () => {
            const first = paginateEntities(mockEntities, 10, 0);
            expect(first.hasNext).toBe(true);
            expect(first.hasPrev).toBe(false);

            const middle = paginateEntities(mockEntities, 10, 2);
            expect(middle.hasNext).toBe(true);
            expect(middle.hasPrev).toBe(true);

            const last = paginateEntities(mockEntities, 10, 4);
            expect(last.hasNext).toBe(false);
            expect(last.hasPrev).toBe(true);
        });

        it('handles empty array', () => {
            const result = paginateEntities([], 10, 0);
            expect(result.items.length).toBe(0);
            expect(result.total).toBe(0);
        });

        it('handles non-array', () => {
            const result = paginateEntities(null, 10, 0);
            expect(result.items).toEqual([]);
        });
    });

    describe('filterEntitiesByBounds', () => {
        it('filters by bounding box', () => {
            const bounds = { minLat: 40, maxLat: 42, minLon: -76, maxLon: -74 };
            const filtered = filterEntitiesByBounds(mockEntities, bounds);
            expect(filtered.length).toBeGreaterThan(0);
        });

        it('returns all when no bounds provided', () => {
            const result = filterEntitiesByBounds(mockEntities, null);
            expect(result.length).toBe(50);
        });

        it('filters out entities outside bounds', () => {
            const bounds = { minLat: 40.1, maxLat: 40.2, minLon: -74.1, maxLon: -74.2 };
            const filtered = filterEntitiesByBounds(mockEntities, bounds);
            expect(filtered.length).toBeLessThan(50);
        });
    });

    describe('sortEntitiesByDistance', () => {
        it('sorts by distance from reference point', () => {
            const refPoint = { latitude: 40.05, longitude: -74.05 };
            const sorted = sortEntitiesByDistance(mockEntities, refPoint);
            
            expect(sorted[0].id).toBe('entity-0');
            expect(sorted[1].id).toBe('entity-1');
        });

        it('handles null entities', () => {
            const result = sortEntitiesByDistance(null, { latitude: 40, longitude: -74 });
            expect(result).toBeNull();
        });

        it('handles null reference point', () => {
            const result = sortEntitiesByDistance(mockEntities, null);
            expect(result.length).toBe(50);
        });
    });
});