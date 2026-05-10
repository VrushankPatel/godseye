import { describe, it, expect } from 'vitest';
import {
    normalizeCallsign,
    classifyFlight,
    isMilitaryFlight,
    isCargoFlight,
    isPassengerFlight,
    isPrivateFlight,
} from '../../src/utils/aircraftClassification';

describe('aircraftClassification', () => {
    describe('normalizeCallsign', () => {
        it('trims and uppercases callsign', () => {
            expect(normalizeCallsign('  abc123  ')).toBe('ABC123');
        });

        it('removes whitespace', () => {
            expect(normalizeCallsign('A B C 1 2 3')).toBe('ABC123');
        });

        it('handles null/undefined', () => {
            expect(normalizeCallsign(null)).toBe('');
            expect(normalizeCallsign(undefined)).toBe('');
        });
    });

    describe('classifyFlight', () => {
        it('classifies military callsigns', () => {
            expect(classifyFlight({ callsign: 'RCH123' })).toBe('military');
            expect(classifyFlight({ callsign: 'CMB456' })).toBe('military');
            expect(classifyFlight({ callsign: 'KING789' })).toBe('military');
        });

        it('classifies cargo callsigns', () => {
            expect(classifyFlight({ callsign: 'FDX123' })).toBe('cargo');
            expect(classifyFlight({ callsign: 'UPS456' })).toBe('cargo');
            expect(classifyFlight({ callsign: 'DHL789' })).toBe('cargo');
        });

        it('classifies military types', () => {
            expect(classifyFlight({ aircraftType: 'C17' })).toBe('military');
            expect(classifyFlight({ aircraftType: 'C130' })).toBe('military');
        });

        it('classifies cargo types', () => {
            expect(classifyFlight({ aircraftType: '744F' })).toBe('cargo');
            expect(classifyFlight({ aircraftType: '748F' })).toBe('cargo');
        });

        it('classifies by operator', () => {
            expect(classifyFlight({ operator: 'AIR FORCE' })).toBe('military');
            expect(classifyFlight({ operator: 'United Airlines' })).toBe('passenger');
            expect(classifyFlight({ operator: 'Cargo Airlines' })).toBe('cargo');
        });

        it('classifies passenger flights', () => {
            expect(classifyFlight({ callsign: 'UAL123' })).toBe('passenger');
            expect(classifyFlight({ callsign: 'AAL456' })).toBe('passenger');
        });

        it('classifies private by category code', () => {
            expect(classifyFlight({ categoryCode: 'A1' })).toBe('private');
            expect(classifyFlight({ categoryCode: 'A2' })).toBe('private');
        });

        it('returns unknown for empty flights', () => {
            expect(classifyFlight({})).toBe('unknown');
        });
    });

    describe('isMilitaryFlight', () => {
        it('returns true for military flights', () => {
            expect(isMilitaryFlight({ callsign: 'RCH123' })).toBe(true);
        });

        it('returns false for non-military flights', () => {
            expect(isMilitaryFlight({ callsign: 'UAL123' })).toBe(false);
        });
    });

    describe('isCargoFlight', () => {
        it('returns true for cargo flights', () => {
            expect(isCargoFlight({ callsign: 'FDX123' })).toBe(true);
        });

        it('returns false for non-cargo flights', () => {
            expect(isCargoFlight({ callsign: 'UAL123' })).toBe(false);
        });
    });

    describe('isPassengerFlight', () => {
        it('returns true for passenger flights', () => {
            expect(isPassengerFlight({ callsign: 'UAL123' })).toBe(true);
        });

        it('returns false for non-passenger flights', () => {
            expect(isPassengerFlight({ callsign: 'RCH123' })).toBe(false);
        });
    });

    describe('isPrivateFlight', () => {
        it('returns true for private flights', () => {
            expect(isPrivateFlight({ categoryCode: 'A1' })).toBe(true);
        });

        it('returns false for commercial flights', () => {
            expect(isPrivateFlight({ callsign: 'UAL123' })).toBe(false);
        });
    });
});