import { describe, it, expect } from 'vitest';
import {
    parseAdsbPayload,
    parseAircraftRecord,
    convertAltitude,
    convertSpeed,
} from '../../src/utils/adsbParser';

describe('adsbParser', () => {
    describe('parseAdsbPayload', () => {
        it('returns empty array for invalid payload', () => {
            expect(parseAdsbPayload(null)).toEqual([]);
            expect(parseAdsbPayload({})).toEqual([]);
            expect(parseAdsbPayload({ ac: null })).toEqual([]);
        });

        it('parses array of aircraft', () => {
            const payload = {
                ac: [
                    { lat: 40.7, lon: -74.0, flight: 'UAL123', alt_baro: 37000 },
                    { lat: 35.7, lon: -74.0, flight: 'AAL456', alt_baro: 35000 },
                ],
            };
            const result = parseAdsbPayload(payload, 'test');
            expect(result.length).toBe(2);
            expect(result[0].callsign).toBe('UAL123');
            expect(result[1].callsign).toBe('AAL456');
        });
    });

    describe('parseAircraftRecord', () => {
        it('handles zero coordinate values', () => {
            const record = parseAircraftRecord({ lat: 0, lon: 0 });
            expect(record).toBeDefined();
            expect(record.longitude).toBe(0);
            expect(record.latitude).toBe(0);
        });

        it('returns null for string null', () => {
            expect(parseAircraftRecord({ lat: 'null', lon: 'null' })).toBeNull();
            expect(parseAircraftRecord({ lat: 'invalid', lon: 'invalid' })).toBeNull();
        });

        it('returns null for ground aircraft', () => {
            expect(parseAircraftRecord({ lat: 40.7, lon: -74.0, alt_baro: 'ground' })).toBeNull();
            expect(parseAircraftRecord({ lat: 40.7, lon: -74.0, alt_geom: 50 })).toBeNull();
        });

        it('parses altitude in meters', () => {
            const record = parseAircraftRecord({ lat: 40.7, lon: -74.0, alt_baro: 37000 });
            expect(record.altitudeM).toBeCloseTo(11277.6, 0);
        });

        it('parses speed in mps', () => {
            const record = parseAircraftRecord({ lat: 40.7, lon: -74.0, gs: 450 });
            expect(record.speedMps).toBeCloseTo(231.5, 1);
        });

        it('uses geometric altitude as fallback', () => {
            const record = parseAircraftRecord({ lat: 40.7, lon: -74.0, alt_geom: 38000 });
            expect(record.altitudeM).toBeCloseTo(11582, 0);
        });

        it('defaults missing values', () => {
            const record = parseAircraftRecord({ lat: 40.7, lon: -74.0 });
            expect(record.callsign).toBe('UNKNOWN');
            expect(record.operator).toBe('Unknown');
            expect(record.aircraftType).toBe('N/A');
        });
    });

    describe('convertAltitude', () => {
        it('converts feet to meters', () => {
            expect(convertAltitude(37000)).toBeCloseTo(11277.6, 1);
        });

        it('returns null for invalid input', () => {
            expect(convertAltitude(null)).toBeNull();
            expect(convertAltitude('invalid')).toBeNull();
        });
    });

    describe('convertSpeed', () => {
        it('converts knots to mps', () => {
            expect(convertSpeed(450)).toBeCloseTo(231.5, 1);
        });

        it('returns null for invalid input', () => {
            expect(convertSpeed(null)).toBeNull();
            expect(convertSpeed('invalid')).toBeNull();
        });
    });
});