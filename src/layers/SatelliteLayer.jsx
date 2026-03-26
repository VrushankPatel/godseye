import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';
import { getSatelliteLiveView, getSatellitePriorityScore } from '../constants/satelliteLiveViews';
import { isSharedCacheFresh } from '../services/sharedRuntimeCache';
import { readLayerCache, writeLayerCache } from '../utils/layerCache';
import { fetchJsonWithPolicy } from '../utils/network';

const PAGE_SIZE = 100;
const MAX_FETCH_PAGES = 120; // up to ~12,000 records from fallback API
const PAGE_FETCH_CONCURRENCY = 6;
const MAX_RENDERED_SATELLITES = 12000;
const SATELLITE_CACHE_KEY = 'satellite-tle-records-v2';
const SATELLITE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

function normalizeRawTleRecord(item = {}) {
    const line1 = String(item.line1 || '').trim();
    const line2 = String(item.line2 || '').trim();
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) return null;

    const id = String(item.satelliteId || item.NORAD_CAT_ID || line1.slice(2, 7).trim() || 'UNKNOWN');
    return {
        id,
        name: String(item.name || item.OBJECT_NAME || `SAT-${id}`).trim(),
        line1,
        line2,
    };
}

function hydrateTleRecords(rawRecords = []) {
    const records = [];
    for (const rawRecord of rawRecords) {
        if (!rawRecord?.line1 || !rawRecord?.line2) continue;
        try {
            const satrec = satellite.twoline2satrec(rawRecord.line1, rawRecord.line2);
            if (!satrec || !satrec.satnum) continue;
            records.push({
                id: String(rawRecord.id || satrec.satnum),
                name: rawRecord.name || `SAT-${satrec.satnum}`,
                satrec,
                liveView: getSatelliteLiveView(rawRecord.name),
            });
        } catch (err) {
            // Skip invalid rows.
        }
    }

    return records.sort((a, b) => {
        const scoreDiff = getSatellitePriorityScore(b.name) - getSatellitePriorityScore(a.name);
        if (scoreDiff !== 0) return scoreDiff;
        return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

function parseTleTextLoose(text) {
    const rawRecords = [];
    const lines = String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    let pendingName = '';

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const nextLine = lines[i + 1]?.trim();
        if (line.startsWith('1 ') && nextLine?.startsWith('2 ')) {
            const rawRecord = normalizeRawTleRecord({
                name: pendingName || `SAT-${rawRecords.length + 1}`,
                line1: line,
                line2: nextLine,
            });
            if (rawRecord) rawRecords.push(rawRecord);
            pendingName = '';
            i += 1;
            continue;
        }

        if (!/^Title:|^URL Source:|^Markdown Content:?$/i.test(line)) {
            pendingName = line;
        }
    }

    return rawRecords;
}

function getTotalPages(view) {
    const last = view?.last;
    if (!last || typeof last !== 'string') return null;
    const match = last.match(/[?&]page=(\d+)/);
    return match ? Number(match[1]) : null;
}

async function fetchTlePage(page, signal) {
    return fetchJsonWithPolicy(`${API_URLS.TLE_API_BASE}?page=${page}&page-size=${PAGE_SIZE}`, {
        signal,
        timeoutMs: 15000,
        retries: 1,
        circuitKey: `satellites:tle-api:page:${page}`,
    });
}

async function fetchManifestFallback(signal) {
    return fetchJsonWithPolicy(API_URLS.SATELLITE_ACTIVE_MANIFEST, {
        signal,
        timeoutMs: 15000,
        retries: 1,
        circuitKey: 'satellites:manifest-fallback',
    });
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

function getSatelliteRenderBudget(activeShader, cameraHeightM) {
    const isGodMode = activeShader === 'GOD';
    if (cameraHeightM > 9000000) return isGodMode ? 1800 : 5000;
    if (cameraHeightM > 3000000) return isGodMode ? 3200 : 8500;
    return isGodMode ? 4800 : MAX_RENDERED_SATELLITES;
}

export default function SatelliteLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.satellites.enabled);
    const appIsActive = useStore((s) => s.appIsActive);
    const activeShader = useStore((s) => s.activeShader);
    const satelliteRefreshToken = useStore((s) => s.layerRefreshTokens.satellites);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const markLayerFetchStart = useStore((s) => s.markLayerFetchStart);
    const sharedRuntimeCache = useStore((s) => s.sharedRuntimeCache);

    const entitiesRef = useRef(new Map());
    const satRecordsRef = useRef([]);
    const updateTimerRef = useRef(null);
    const abortRef = useRef(null);
    const satelliteIconRef = useRef(null);
    const lastRefreshTokenRef = useRef(0);

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
        const cameraHeightM = viewer.camera.positionCartographic?.height || 0;
        const renderBudget = getSatelliteRenderBudget(activeShader, cameraHeightM);
        const activeRecords = satRecordsRef.current.slice(0, renderBudget);

        activeRecords.forEach(({ id, name, satrec, liveView }) => {
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
                entity.properties.mediaEnabled = Boolean(liveView?.mediaEnabled);
                entity.properties.url = liveView?.url || null;
                entity.properties.videoUrl = liveView?.videoUrl || null;
                entity.properties.fallbackUrl = liveView?.fallbackUrl || liveView?.url || null;
                entity.properties.detailsUrl = liveView?.detailsUrl || null;
                entity.properties.mediaType = liveView?.mediaType || null;
                entity.properties.refreshSeconds = liveView?.refreshSeconds || 600;
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
                        mediaEnabled: Boolean(liveView?.mediaEnabled),
                        url: liveView?.url || null,
                        videoUrl: liveView?.videoUrl || null,
                        fallbackUrl: liveView?.fallbackUrl || liveView?.url || null,
                        detailsUrl: liveView?.detailsUrl || null,
                        mediaType: liveView?.mediaType || null,
                        refreshSeconds: liveView?.refreshSeconds || 600,
                        liveView: liveView?.liveView || 'UNAVAILABLE',
                        liveSource: liveView?.liveSource || 'N/A',
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
    }, [activeShader, viewer]);

    const startPropagation = useCallback(() => {
        clearInterval(updateTimerRef.current);
        if (!appIsActive) return;
        updateSatellitePositions();
        updateTimerRef.current = setInterval(updateSatellitePositions, POLL_INTERVALS.SATELLITES);
    }, [appIsActive, updateSatellitePositions]);

    const loadFromPaginatedApi = useCallback(async (signal) => {
        const rawAggregate = [];

        const firstPage = await fetchTlePage(1, signal);
        rawAggregate.push(
            ...((firstPage.member || []).map(normalizeRawTleRecord).filter(Boolean))
        );

        const initialRecords = hydrateTleRecords(rawAggregate);
        updateData('satellites', initialRecords, {
            sourceName: 'TLE API live pages',
            isCached: false,
            health: 'live',
        });
        writeLayerCache(SATELLITE_CACHE_KEY, rawAggregate);

        // Render immediately after first page
        satRecordsRef.current = [...initialRecords];
        setStatus('satellites', 'active', {
            sourceName: 'TLE API live pages',
            isCached: false,
            health: 'live',
        });
        startPropagation();

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
                rawAggregate.push(
                    ...((result.value.member || []).map(normalizeRawTleRecord).filter(Boolean))
                );
            }

            if (signal.aborted || !isEnabled) return [];

            // Progressive update — propagation timer will render new ones
            const hydratedRecords = hydrateTleRecords(rawAggregate);
            satRecordsRef.current = [...hydratedRecords];
            updateData('satellites', hydratedRecords, {
                sourceName: 'TLE API live pages',
                isCached: false,
                health: 'live',
            });
        }

        writeLayerCache(SATELLITE_CACHE_KEY, rawAggregate);
        return hydrateTleRecords(rawAggregate);
    }, [isEnabled, updateData, setStatus, startPropagation]);

    const loadSatellites = useCallback(async () => {
        if (!appIsActive) return;
        markLayerFetchStart('satellites', { sourceName: 'TLE API live pages' });
        setStatus('satellites', 'loading', { sourceName: 'TLE API live pages' });
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        const cachedRawRecords = readLayerCache(SATELLITE_CACHE_KEY, SATELLITE_CACHE_TTL_MS);
        const sharedManifestRecords = Array.isArray(sharedRuntimeCache?.data?.satelliteManifest?.records)
            ? sharedRuntimeCache.data.satelliteManifest.records
            : [];
        if (isSharedCacheFresh(sharedRuntimeCache?.timestamp) && sharedManifestRecords.length) {
            const sharedRecords = hydrateTleRecords(sharedManifestRecords);
            satRecordsRef.current = sharedRecords;
            updateData('satellites', sharedRecords, {
                sourceName: 'Shared RTDB satellite cache',
                isCached: true,
                health: 'cached',
            });
            setStatus('satellites', 'active', {
                sourceName: 'Shared RTDB satellite cache',
                isCached: true,
                health: 'cached',
            });
            startPropagation();
            return;
        }
        if (Array.isArray(cachedRawRecords) && cachedRawRecords.length) {
            const cachedRecords = hydrateTleRecords(cachedRawRecords);
            if (cachedRecords.length) {
                satRecordsRef.current = cachedRecords;
                updateData('satellites', cachedRecords, {
                    sourceName: 'Local satellite cache',
                    isCached: true,
                    health: 'cached',
                });
                setStatus('satellites', 'active', {
                    sourceName: 'Local satellite cache',
                    isCached: true,
                    health: 'cached',
                });
                startPropagation();
            }
        }

        try {
            const records = await loadFromPaginatedApi(controller.signal);

            if (controller.signal.aborted || !isEnabled) return;
            if (!records.length) throw new Error('No satellite records available');

            satRecordsRef.current = records;
            updateData('satellites', records, {
                sourceName: 'TLE API live pages',
                isCached: false,
                health: 'live',
            });
            setStatus('satellites', 'active', {
                sourceName: 'TLE API live pages',
                isCached: false,
                health: 'live',
            });

            // startPropagation is called progressively inside loadFromPaginatedApi now
            // but ensure final state is propagating
            startPropagation();
        } catch (err) {
            if (controller.signal.aborted) return;

            let fallbackRecords = [];
            try {
                const manifestPayload = await fetchManifestFallback(controller.signal);
                const officialRawRecords = Array.isArray(manifestPayload?.records)
                    ? manifestPayload.records.map(normalizeRawTleRecord).filter(Boolean)
                    : [];
                if (officialRawRecords.length) {
                    writeLayerCache(SATELLITE_CACHE_KEY, officialRawRecords);
                    fallbackRecords = hydrateTleRecords(officialRawRecords);
                }
            } catch (fallbackErr) {
                // Fall through to bundled emergency TLE sample.
            }

            if (!fallbackRecords.length) {
                fallbackRecords = hydrateTleRecords(parseTleTextLoose(FALLBACK_TLE));
            }

            satRecordsRef.current = fallbackRecords;
            updateData('satellites', fallbackRecords, {
                sourceName: fallbackRecords.length ? 'Satellite fallback manifest' : 'Bundled emergency TLE',
                isCached: true,
                health: fallbackRecords.length ? 'cached' : 'error',
                errorCode: fallbackRecords.length ? null : 'satellite_feed_unavailable',
            });
            setStatus('satellites', fallbackRecords.length ? 'active' : 'error', {
                sourceName: fallbackRecords.length ? 'Satellite fallback manifest' : 'Bundled emergency TLE',
                isCached: fallbackRecords.length,
                health: fallbackRecords.length ? 'cached' : 'error',
                errorCode: fallbackRecords.length ? null : 'satellite_feed_unavailable',
            });
            startPropagation();
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
            }
        }
    }, [appIsActive, isEnabled, loadFromPaginatedApi, setStatus, updateData, startPropagation, markLayerFetchStart, sharedRuntimeCache]);

    useEffect(() => {
        if (!satelliteIconRef.current) {
            satelliteIconRef.current = createSatelliteIconDataUri();
        }
    }, []);

    useEffect(() => {
        if (!isEnabled) {
            clearSatellites();
            setStatus('satellites', 'idle', { sourceName: 'Satellite layer disabled', health: 'idle' });
            updateData('satellites', [], { status: 'idle', sourceName: 'Satellite layer disabled', health: 'idle' });
            return;
        }

        if (!appIsActive) {
            clearInterval(updateTimerRef.current);
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
            return;
        }

        clearSatellites();
        loadSatellites();

        return () => {
            clearInterval(updateTimerRef.current);
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
    }, [appIsActive, isEnabled, clearSatellites, setStatus, updateData, loadSatellites]);

    useEffect(() => {
        if (!appIsActive || !isEnabled || !satelliteRefreshToken) return;
        if (lastRefreshTokenRef.current === satelliteRefreshToken) return;

        lastRefreshTokenRef.current = satelliteRefreshToken;
        loadSatellites();
    }, [appIsActive, isEnabled, loadSatellites, satelliteRefreshToken]);

    useEffect(
        () => () => {
            clearSatellites();
        },
        [clearSatellites]
    );

    return null;
}
