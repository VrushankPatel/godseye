import { describe, it, expect } from 'vitest';
import {
    isCacheValid,
} from '../../src/utils/cache';

describe('cache utilities', () => {
    describe('isCacheValid', () => {
        it('returns false for null/undefined', () => {
            expect(isCacheValid(null)).toBe(false);
            expect(isCacheValid(undefined)).toBe(false);
        });

        it('returns false for record without timestamp', () => {
            expect(isCacheValid({ key: 'test' })).toBe(false);
        });

        it('returns true for valid non-expiring record', () => {
            expect(isCacheValid({ timestamp: Date.now() })).toBe(true);
        });

        it('returns true for unexpired record', () => {
            const record = {
                timestamp: Date.now(),
                expiresAt: Date.now() + 3600000,
            };
            expect(isCacheValid(record)).toBe(true);
        });

        it('returns false for expired record', () => {
            const record = {
                timestamp: Date.now() - 7200000,
                expiresAt: Date.now() - 3600000,
            };
            expect(isCacheValid(record)).toBe(false);
        });
    });
});