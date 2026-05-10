import { describe, it, expect } from 'vitest';
import {
    toRadians,
    toDegrees,
    normalizeLongitude,
    projectPosition,
    calculateDistanceM,
    clamp,
    formatCoordinate,
} from '../../src/utils/geo';

describe('geo utilities', () => {
    describe('toRadians', () => {
        it('converts 0 degrees to 0 radians', () => {
            expect(toRadians(0)).toBe(0);
        });

        it('converts 180 degrees to PI radians', () => {
            expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
        });

        it('converts 90 degrees to PI/2 radians', () => {
            expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
        });
    });

    describe('toDegrees', () => {
        it('converts 0 radians to 0 degrees', () => {
            expect(toDegrees(0)).toBe(0);
        });

        it('converts PI radians to 180 degrees', () => {
            expect(toDegrees(Math.PI)).toBeCloseTo(180, 10);
        });

        it('converts PI/2 radians to 90 degrees', () => {
            expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
        });
    });

    describe('normalizeLongitude', () => {
        it('keeps values within -180 to 180 unchanged', () => {
            expect(normalizeLongitude(45)).toBe(45);
            expect(normalizeLongitude(-45)).toBe(-45);
        });

        it('wraps values greater than 180', () => {
            expect(normalizeLongitude(200)).toBe(-160);
            expect(normalizeLongitude(540)).toBe(180);
        });

        it('wraps values less than -180', () => {
            expect(normalizeLongitude(-200)).toBe(160);
            expect(normalizeLongitude(-540)).toBe(-180);
        });
    });

    describe('projectPosition', () => {
        it('returns original position for invalid inputs', () => {
            expect(projectPosition(0, 0, 0, 0, 10)).toEqual({ longitude: 0, latitude: 0 });
            expect(projectPosition(null, null, 0, 100, 10)).toEqual({ longitude: null, latitude: null });
        });

        it('projects position with heading and speed', () => {
            const result = projectPosition(0, 0, 90, 1000, 10);
            expect(result.longitude).toBeGreaterThan(0);
            expect(result.latitude).toBeCloseTo(0, 2);
        });
    });

    describe('calculateDistanceM', () => {
        it('returns 0 for same point', () => {
            expect(calculateDistanceM(0, 0, 0, 0)).toBe(0);
        });

        it('calculates distance between two points', () => {
            const dist = calculateDistanceM(0, 0, 1, 1);
            expect(dist).toBeGreaterThan(150000);
            expect(dist).toBeLessThan(160000);
        });
    });

    describe('clamp', () => {
        it('returns value when within range', () => {
            expect(clamp(5, 0, 10)).toBe(5);
        });

        it('returns min when value is below range', () => {
            expect(clamp(-5, 0, 10)).toBe(0);
        });

        it('returns max when value is above range', () => {
            expect(clamp(15, 0, 10)).toBe(10);
        });
    });

    describe('formatCoordinate', () => {
        it('formats latitude with N direction', () => {
            expect(formatCoordinate(45, true)).toBe('45.0000° N');
        });

        it('formats latitude with S direction', () => {
            expect(formatCoordinate(-45, true)).toBe('45.0000° S');
        });

        it('formats longitude with E direction', () => {
            expect(formatCoordinate(90, false)).toBe('90.0000° E');
        });

        it('formats longitude with W direction', () => {
            expect(formatCoordinate(-90, false)).toBe('90.0000° W');
        });
    });
});