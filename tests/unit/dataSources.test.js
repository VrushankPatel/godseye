import { describe, it, expect } from 'vitest';
import { LAYER_DEFS, POLL_INTERVALS, SHADER_MODES, SURVEILLANCE_PRIMARY_LAYERS } from '../../src/constants/dataSources';

describe('dataSources constants', () => {
    describe('LAYER_DEFS', () => {
        it('contains aircraft layer definition', () => {
            expect(LAYER_DEFS.aircraft).toBeDefined();
            expect(LAYER_DEFS.aircraft.label).toBe('AIRCRAFT');
        });

        it('contains all required layer definitions', () => {
            expect(LAYER_DEFS.satellites).toBeDefined();
            expect(LAYER_DEFS.seismic).toBeDefined();
            expect(LAYER_DEFS.airports).toBeDefined();
            expect(LAYER_DEFS.cctv).toBeDefined();
        });

        it('has color and icon for each layer', () => {
            for (const def of Object.values(LAYER_DEFS)) {
                expect(def.color).toBeDefined();
                expect(def.icon).toBeDefined();
            }
        });
    });

    describe('POLL_INTERVALS', () => {
        it('has reasonable polling intervals', () => {
            expect(POLL_INTERVALS.AIRCRAFT).toBeLessThan(30000);
            expect(POLL_INTERVALS.SATELLITES).toBeLessThan(10000);
            expect(POLL_INTERVALS.SEISMIC).toBeLessThan(120000);
        });

        it('uses milliseconds', () => {
            expect(POLL_INTERVALS.AIRPORTS).toBeGreaterThan(3600000);
        });
    });

    describe('SHADER_MODES', () => {
        it('contains 6 shader modes', () => {
            expect(SHADER_MODES.length).toBe(6);
        });

        it('has DEFAULT mode as first', () => {
            expect(SHADER_MODES[0].id).toBe('DEFAULT');
        });

        it('has unique IDs', () => {
            const ids = SHADER_MODES.map(m => m.id);
            const unique = new Set(ids);
            expect(ids.length).toBe(unique.size);
        });
    });

    describe('SURVEILLANCE_PRIMARY_LAYERS', () => {
        it('is an array of layer names', () => {
            expect(Array.isArray(SURVEILLANCE_PRIMARY_LAYERS)).toBe(true);
        });

        it('contains aircraft', () => {
            expect(SURVEILLANCE_PRIMARY_LAYERS).toContain('aircraft');
        });

        it('has no duplicates', () => {
            const unique = new Set(SURVEILLANCE_PRIMARY_LAYERS);
            expect(SURVEILLANCE_PRIMARY_LAYERS.length).toBe(unique.size);
        });
    });
});