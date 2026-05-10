import { describe, it, expect } from 'vitest';
import {
    getGodModeLayerBudgets,
    MIN_CAMERA_HEIGHT_M,
    MAX_CAMERA_HEIGHT_M,
    AIRCRAFT_TRACK_VIEWS,
    SATELLITE_TRACK_VIEWS,
} from '../../src/constants/globe';

describe('globe constants', () => {
    describe('getGodModeLayerBudgets', () => {
        it('returns high altitude budgets for high altitude', () => {
            const budgets = getGodModeLayerBudgets(10000000);
            expect(budgets.aircraft).toBe(1400);
            expect(budgets.satellites).toBe(1800);
        });

        it('returns mid altitude budgets for mid altitude', () => {
            const budgets = getGodModeLayerBudgets(4000000);
            expect(budgets.aircraft).toBe(2600);
            expect(budgets.satellites).toBe(3200);
        });

        it('returns low altitude budgets for low altitude', () => {
            const budgets = getGodModeLayerBudgets(1000000);
            expect(budgets.aircraft).toBe(4200);
            expect(budgets.satellites).toBe(4800);
        });
    });

    describe('AIRCRAFT_TRACK_VIEWS', () => {
        it('contains CHASE view', () => {
            expect(AIRCRAFT_TRACK_VIEWS.CHASE).toBeDefined();
        });

        it('contains TOP view', () => {
            expect(AIRCRAFT_TRACK_VIEWS.TOP).toBeDefined();
        });

        it('contains SIDE view', () => {
            expect(AIRCRAFT_TRACK_VIEWS.SIDE).toBeDefined();
        });

        it('contains CINEMATIC view', () => {
            expect(AIRCRAFT_TRACK_VIEWS.CINEMATIC).toBeDefined();
        });
    });

    describe('SATELLITE_TRACK_VIEWS', () => {
        it('contains ORBIT view', () => {
            expect(SATELLITE_TRACK_VIEWS.ORBIT).toBeDefined();
        });

        it('contains NADIR view', () => {
            expect(SATELLITE_TRACK_VIEWS.NADIR).toBeDefined();
        });

        it('contains WIDE view', () => {
            expect(SATELLITE_TRACK_VIEWS.WIDE).toBeDefined();
        });
    });

    describe('camera height constants', () => {
        it('defines valid min camera height', () => {
            expect(MIN_CAMERA_HEIGHT_M).toBeGreaterThan(0);
        });

        it('defines valid max camera height', () => {
            expect(MAX_CAMERA_HEIGHT_M).toBeGreaterThan(MIN_CAMERA_HEIGHT_M);
        });
    });
});