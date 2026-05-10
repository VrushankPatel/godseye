import { describe, it, expect } from 'vitest';
import {
    CITIES_TIER_1,
    CITIES_TIER_2,
    CITIES_TIER_3,
    CITIES_TIER_4,
    CITIES_TIER_5,
    ALL_CITIES,
    getCityByName,
} from '../../src/constants/cities';

describe('cities constants', () => {
    describe('CITIES_TIER_1', () => {
        it('contains global megacities', () => {
            expect(CITIES_TIER_1.length).toBeGreaterThan(15);
            expect(CITIES_TIER_1.find(c => c.name === 'Tokyo')).toBeDefined();
            expect(CITIES_TIER_1.find(c => c.name === 'New York')).toBeDefined();
            expect(CITIES_TIER_1.find(c => c.name === 'Shanghai')).toBeDefined();
        });

        it('has valid coordinates', () => {
            for (const city of CITIES_TIER_1) {
                expect(city.longitude).toBeGreaterThanOrEqual(-180);
                expect(city.longitude).toBeLessThanOrEqual(180);
                expect(city.latitude).toBeGreaterThanOrEqual(-90);
                expect(city.latitude).toBeLessThanOrEqual(90);
                expect(city.height).toBeGreaterThan(0);
            }
        });
    });

    describe('getCityByName', () => {
        it('returns city by exact name', () => {
            const city = getCityByName('Tokyo');
            expect(city).toBeDefined();
            expect(city.longitude).toBe(139.6917);
            expect(city.latitude).toBe(35.6895);
        });

        it('returns undefined for unknown city', () => {
            expect(getCityByName('Unknown City')).toBeUndefined();
        });

        it('is case-sensitive', () => {
            expect(getCityByName('tokyo')).toBeUndefined();
        });
    });

    describe('ALL_CITIES', () => {
        it('contains all tier cities', () => {
            expect(ALL_CITIES.length).toBe(
                CITIES_TIER_1.length + CITIES_TIER_2.length +
                CITIES_TIER_3.length + CITIES_TIER_4.length +
                CITIES_TIER_5.length
            );
        });

        it('has no duplicate names', () => {
            const names = ALL_CITIES.map(c => c.name);
            const unique = new Set(names);
            expect(names.length).toBe(unique.size);
        });
    });
});