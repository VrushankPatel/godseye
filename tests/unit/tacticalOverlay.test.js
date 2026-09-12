import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeAustinFeeds } from '../../src/services/cctvFeeds';
import overlayRegistry from '../../src/services/overlayRegistry';
import { API_URLS } from '../../src/constants/dataSources';

describe('Tactical World Overlay & CCTV Integration', () => {
    describe('API_URLS', () => {
        it('has CAMERA_AUSTIN_OPEN_DATA endpoint defined', () => {
            expect(API_URLS.CAMERA_AUSTIN_OPEN_DATA).toBeDefined();
            expect(API_URLS.CAMERA_AUSTIN_OPEN_DATA).toContain('data.austintexas.gov');
        });
    });

    describe('normalizeAustinFeeds', () => {
        it('normalizes Austin Open Data records correctly', () => {
            const rawRecords = [
                {
                    camera_id: '101',
                    location_name: '15TH ST / NUECE',
                    camera_status: 'TURNED_ON',
                    location_latitude: '30.2785',
                    location_longitude: '-97.7460',
                    screenshot_address: 'https://cctv.austinmobility.io/image/101.jpg',
                },
                {
                    camera_id: '102',
                    location_name: 'GUADALUPE ST / 1444',
                    camera_status: 'TURNED_ON',
                    location: {
                        coordinates: [-97.7420, 30.2770],
                    },
                },
                {
                    camera_id: '103',
                    location_name: 'INACTIVE CAM',
                    camera_status: 'REMOVED',
                    location_latitude: '30.2700',
                    location_longitude: '-97.7400',
                },
                {
                    camera_id: '104',
                    location_name: 'FAR OFF LOCATION',
                    camera_status: 'TURNED_ON',
                    location_latitude: '45.0000',
                    location_longitude: '-120.0000',
                },
            ];

            const feeds = normalizeAustinFeeds(rawRecords);
            expect(feeds.length).toBe(2);

            const cam1 = feeds.find((f) => f.id === 'austin-101');
            expect(cam1).toBeDefined();
            expect(cam1.name).toBe('15TH ST / NUECE');
            expect(cam1.lat).toBeCloseTo(30.2785);
            expect(cam1.lng).toBeCloseTo(-97.7460);
            expect(cam1.url).toBe('https://cctv.austinmobility.io/image/101.jpg');
            expect(cam1.city).toBe('Austin');
            expect(cam1.provider).toContain('Austin Transportation');

            const cam2 = feeds.find((f) => f.id === 'austin-102');
            expect(cam2).toBeDefined();
            expect(cam2.name).toBe('GUADALUPE ST / 1444');
            expect(cam2.lat).toBeCloseTo(30.2770);
            expect(cam2.lng).toBeCloseTo(-97.7420);
            expect(cam2.url).toBe('https://cctv.austinmobility.io/image/102.jpg');
        });

        it('returns empty array on invalid payload', () => {
            expect(normalizeAustinFeeds(null)).toEqual([]);
            expect(normalizeAustinFeeds('not-json')).toEqual([]);
            expect(normalizeAustinFeeds({})).toEqual([]);
        });

        it('respects maxFeeds limit', () => {
            const records = Array.from({ length: 10 }, (_, i) => ({
                camera_id: String(i + 1),
                location_name: `STREET ${i + 1}`,
                camera_status: 'TURNED_ON',
                location_latitude: '30.27',
                location_longitude: '-97.74',
            }));
            const feeds = normalizeAustinFeeds(records, 3);
            expect(feeds.length).toBe(3);
        });
    });

    describe('overlayRegistry', () => {
        beforeEach(() => {
            overlayRegistry.clear();
        });

        it('manages vehicle entries correctly', () => {
            expect(overlayRegistry.isTrafficActive()).toBe(false);
            expect(overlayRegistry.getVehicles()).toEqual([]);

            const testVehicles = [
                { id: 'v1', vehTag: 'VEH-0001', currentMps: 12, headingDeg: 90 },
                { id: 'v2', vehTag: 'VEH-0002', currentMps: 0, headingDeg: 180 },
            ];

            overlayRegistry.setTrafficActive(true);
            overlayRegistry.setVehicles(testVehicles);

            expect(overlayRegistry.isTrafficActive()).toBe(true);
            expect(overlayRegistry.getVehicles().length).toBe(2);
            expect(overlayRegistry.getVehicles()[0].vehTag).toBe('VEH-0001');
        });

        it('manages camera entries correctly', () => {
            expect(overlayRegistry.isCctvActive()).toBe(false);
            expect(overlayRegistry.getCameras()).toEqual([]);

            const testCameras = [
                { id: 'c1', name: '15TH ST / NUECE', lat: 30.27, lng: -97.74 },
            ];

            overlayRegistry.setCctvActive(true);
            overlayRegistry.setCameras(testCameras);

            expect(overlayRegistry.isCctvActive()).toBe(true);
            expect(overlayRegistry.getCameras().length).toBe(1);
            expect(overlayRegistry.getCameras()[0].name).toBe('15TH ST / NUECE');
        });

        it('clears all registries on clear()', () => {
            overlayRegistry.setTrafficActive(true);
            overlayRegistry.setCctvActive(true);
            overlayRegistry.setVehicles([{ id: 'v1' }]);
            overlayRegistry.setCameras([{ id: 'c1' }]);

            overlayRegistry.clear();

            expect(overlayRegistry.isTrafficActive()).toBe(false);
            expect(overlayRegistry.isCctvActive()).toBe(false);
            expect(overlayRegistry.getVehicles()).toEqual([]);
            expect(overlayRegistry.getCameras()).toEqual([]);
        });
    });
});
