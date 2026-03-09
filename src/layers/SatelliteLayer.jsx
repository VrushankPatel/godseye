import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';
import useStore from '../store/useStore';
import { POLL_INTERVALS } from '../constants/dataSources';

const TLE_API_BASE = 'https://tle.ivanstanojevic.me/api/tle/';
const PAGE_SIZE = 100;
const MAX_FETCH_PAGES = 120; // up to ~12,000 records from fallback API
const PAGE_FETCH_CONCURRENCY = 6;
const MAX_RENDERED_SATELLITES = 12000;

const FALLBACK_TLE = `ISS (ZARYA)
1 25544U 98067A   24068.31846065  .00017169  00000+0  31416-3 0  9997
2 25544  51.6406   9.2062 0005705  72.1866  33.9189 15.49883492443026
HST
1 20580U 90037B   24068.27218384  .00003290  00000+0  16259-3 0  9991
2 20580  28.4694 207.2185 0002448  91.1354  30.8351 15.00052309489568
NOAA 19
1 33591U 09005A   24068.45524317  .00000114  00000+0  10065-3 0  9997
2 33591  99.1672  46.8524 0014282 259.9571  99.9880 14.12871373778526
STARLINK-1007
1 44713U 19074A   24068.41666667  .00000000  00000+0  00000+0 0  9990
2 44713  53.0500  10.0000 0001000   0.0000   0.0000 15.06000000000000`;

function parseFallbackTle(text) {
    const records = [];
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    for (let i = 0; i < lines.length; i += 3) {
        if (i + 2 >= lines.length) break;
        const name = lines[i].trim();
        const line1 = lines[i + 1].trim();
        const line2 = lines[i + 2].trim();
        if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) continue;
        try {
            const satrec = satellite.twoline2satrec(line1, line2);
            records.push({
                id: String(satrec.satnum),
                name,
                satrec,
            });
        } catch (err) {
            // Skip invalid rows.
        }
    }
    return records;
}

function parseTleApiMember(member = []) {
    const records = [];
    for (const item of member) {
        if (!item || !item.line1 || !item.line2) continue;
        try {
            const satrec = satellite.twoline2satrec(item.line1.trim(), item.line2.trim());
            if (!satrec || !satrec.satnum) continue;
            records.push({
                id: String(item.satelliteId || satrec.satnum),
                name: item.name || `SAT-${item.satelliteId || satrec.satnum}`,
                satrec,
            });
        } catch (err) {
            // Skip malformed TLE pairs.
        }
    }
    return records;
}

function getTotalPages(view) {
    const last = view?.last;
    if (!last || typeof last !== 'string') return null;
    const match = last.match(/[?&]page=(\d+)/);
    return match ? Number(match[1]) : null;
}

async function fetchTlePage(page, signal) {
    const response = await fetch(`${TLE_API_BASE}?page=${page}&page-size=${PAGE_SIZE}`, {
        signal,
        cache: 'no-store',
    });
    if (!response.ok) throw new Error(`TLE API HTTP ${response.status}`);
    return response.json();
}

function createSatelliteIconDataUri() {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.translate(12, 12);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f8fbff';
    ctx.fillStyle = '#ffaa00';

    // Main body
    ctx.fillRect(-3, -4, 6, 8);
    ctx.strokeRect(-3, -4, 6, 8);

    // Solar panels
    ctx.fillStyle = '#00b4ff';
    ctx.fillRect(-10, -3, 6, 6);
    ctx.strokeRect(-10, -3, 6, 6);
    ctx.fillRect(4, -3, 6, 6);
    ctx.strokeRect(4, -3, 6, 6);

    // Antenna
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(0, 8.5);
    ctx.stroke();

    return canvas.toDataURL('image/png');
}

export default function SatelliteLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.satellites.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const satRecordsRef = useRef([]);
    const updateTimerRef = useRef(null);
    const abortRef = useRef(null);
    const satelliteIconRef = useRef(null);

    const clearSatellites = useCallback(() => {
        clearInterval(updateTimerRef.current);
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current.clear();
        satRecordsRef.current = [];
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
    }, [viewer]);

    const updateSatellitePositions = useCallback(() => {
        if (!satRecordsRef.current.length || !viewer || viewer.isDestroyed()) return;

        const now = new Date();
        const currentIds = new Set();
        const activeRecords = satRecordsRef.current.slice(0, MAX_RENDERED_SATELLITES);

        activeRecords.forEach(({ id, name, satrec }) => {
            const satId = `satellite-${id}`;
            currentIds.add(satId);

            const positionAndVelocity = satellite.propagate(satrec, now);
            const posEci = positionAndVelocity?.position;
            if (!posEci || typeof posEci === 'boolean') return;

            const gmst = satellite.gstime(now);
            const posGd = satellite.eciToGeodetic(posEci, gmst);

            const longitude = satellite.degreesLong(posGd.longitude);
            const latitude = satellite.degreesLat(posGd.latitude);
            const heightKm = posGd.height;
            const heightM = heightKm * 1000;
            if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(heightM)) return;

            const velocity = positionAndVelocity.velocity;
            const velocityKmh = velocity
                ? Math.round(Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2) * 3600)
                : null;
            const orbitalPeriodMinutes = satrec.no ? (2 * Math.PI) / satrec.no : null;

            const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, heightM);

            if (entitiesRef.current.has(satId)) {
                const entity = entitiesRef.current.get(satId);
                entity.position = position;
                entity.properties.latitude = latitude.toFixed(4);
                entity.properties.longitude = longitude.toFixed(4);
                entity.properties.altitude = `${Math.round(heightKm)} km`;
                if (velocityKmh !== null) entity.properties.velocity = `${velocityKmh} km/h`;
            } else {
                const entity = viewer.entities.add({
                    id: satId,
                    position,
                    name,
                    billboard: {
                        image: satelliteIconRef.current,
                        scale: 0.46,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'satellites',
                        designator: id,
                        altitude: `${Math.round(heightKm)} km`,
                        velocity: velocityKmh !== null ? `${velocityKmh} km/h` : 'N/A',
                        period: orbitalPeriodMinutes ? `${orbitalPeriodMinutes.toFixed(1)} min` : 'N/A',
                        inclination: `${((satrec.inclo || 0) * 180 / Math.PI).toFixed(2)}°`,
                        latitude: latitude.toFixed(4),
                        longitude: longitude.toFixed(4),
                        status: 'ORBIT TRACKING',
                    },
                });
                entitiesRef.current.set(satId, entity);
            }
        });

        for (const [id, entity] of entitiesRef.current.entries()) {
            if (!currentIds.has(id)) {
                viewer.entities.remove(entity);
                entitiesRef.current.delete(id);
            }
        }

        // Force Cesium to redraw so updated positions are immediately visible
        viewer.scene.requestRender();
    }, [viewer]);

    const startPropagation = useCallback(() => {
        clearInterval(updateTimerRef.current);
        updateSatellitePositions();
        updateTimerRef.current = setInterval(updateSatellitePositions, POLL_INTERVALS.SATELLITES);
    }, [updateSatellitePositions]);

    const loadFromPaginatedApi = useCallback(async (signal) => {
        const aggregate = [];

        const firstPage = await fetchTlePage(1, signal);
        aggregate.push(...parseTleApiMember(firstPage.member));
        updateData('satellites', aggregate);

        const totalPages = getTotalPages(firstPage.view) || 1;
        const pagesToFetch = Math.min(MAX_FETCH_PAGES, totalPages);

        for (let start = 2; start <= pagesToFetch; start += PAGE_FETCH_CONCURRENCY) {
            const pages = [];
            for (let p = start; p < start + PAGE_FETCH_CONCURRENCY && p <= pagesToFetch; p++) {
                pages.push(p);
            }

            const results = await Promise.allSettled(
                pages.map((page) => fetchTlePage(page, signal))
            );

            for (const result of results) {
                if (result.status !== 'fulfilled') continue;
                aggregate.push(...parseTleApiMember(result.value.member));
            }

            if (signal.aborted || !isEnabled) return [];
            updateData('satellites', aggregate);
        }

        return aggregate;
    }, [isEnabled, updateData]);

    const loadSatellites = useCallback(async () => {
        setStatus('satellites', 'loading');
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const records = await loadFromPaginatedApi(controller.signal);

            if (controller.signal.aborted || !isEnabled) return;
            if (!records.length) throw new Error('No satellite records available');

            satRecordsRef.current = records;
            updateData('satellites', records);
            setStatus('satellites', 'active');
            startPropagation();
        } catch (err) {
            if (controller.signal.aborted) return;

            const fallbackRecords = parseFallbackTle(FALLBACK_TLE);
            satRecordsRef.current = fallbackRecords;
            updateData('satellites', fallbackRecords);
            setStatus('satellites', fallbackRecords.length ? 'active' : 'error');
            startPropagation();
        }
    }, [isEnabled, loadFromPaginatedApi, setStatus, updateData, startPropagation]);

    useEffect(() => {
        if (!satelliteIconRef.current) {
            satelliteIconRef.current = createSatelliteIconDataUri();
        }
    }, []);

    useEffect(() => {
        if (!isEnabled) {
            clearSatellites();
            setStatus('satellites', 'idle');
            updateData('satellites', []);
            return;
        }

        clearSatellites();
        loadSatellites();

        return () => {
            clearSatellites();
        };
    }, [isEnabled, clearSatellites, setStatus, updateData, loadSatellites]);

    return null;
}
